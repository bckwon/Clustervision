#! /bin/python

"""
Cluster Analysis
Desription: This tool helps users find a good clustering of their data.
Clustering can be helpful for summarizing data and making it more interpretable.
Contributers: BC Kwon, Ben Eysenbach
Documentation: https://ibm.ent.box.com/notes/123647604541

Created on 01/17/2017
"""

import json
import lmdb
import numpy as np
import sklearn
import sklearn.cluster
import sklearn.datasets
import sklearn.manifold
import sklearn.metrics
import sklearn.preprocessing
import collections
from flask import Flask, request, render_template
from multiprocessing import Pool
from src import cluster, config, constraints, permute_clustering, superpoints

app = Flask(__name__)

@app.route('/', methods=['POST', 'GET'])
def index():
    return render_template('index.html', data=[])

@app.route('/new_session', methods=['POST', 'GET'])
def new_session():
    num_sessions = cluster.load_num_sessions()
    session_id = num_sessions
    num_sessions += 1

    dataset_name = request.args.get('dataset')
    session = {'dataset': dataset_name,
               'L': config.L_INITIAL}
    cluster.save_session(session_id, session)

    param_vec = cluster.compute_all_clusterings(dataset_name, None)

    session = cluster.load_session(session_id)
    session['param_vec'] = param_vec
    cluster.save_session(session_id, session)
    cluster.save_num_sessions(num_sessions)

    return json.dumps(session_id)

@app.route('/clustering', methods=['POST', 'GET'])
def get_clustering():
    same_cluster = constraints.parse_constraint(str(request.json['constraints']['same_cluster']))
    diff_cluster = constraints.parse_constraint(str(request.json['constraints']['diff_cluster']))
    print 'Same cluster:', same_cluster
    print 'Diff cluster:', diff_cluster

    # with env.begin(write=True) as txn:
    session_id = int(request.json['session_id'])
    user_choice = request.json['user_choice']
    chosen_k = request.json['k']
    print(chosen_k)
    session = cluster.load_session(session_id)

    param_vec = session['param_vec']
    dataset_name = session['dataset']
    # If L is given in the request, use that value.
    # Otherwise, use the value stored in the session
    L = float(request.json['lambda'])
    if L is None:
        L = float(session['L'])

    if 'choices' in session.keys():
        prev_choices = session['choices'][-1]
    else:
        print 'ERROR: no choices'
        prev_choices = []

    compare = lambda x, y: collections.Counter(x) == collections.Counter(y)
    if compare(chosen_k, [2, 20]):
        param_vec = param_vec
    else:
        param_vec = cluster.compute_all_clusterings(dataset_name, chosen_k)
        # session['param_vec'] = param_vec
        # cluster.save_session(session_id, session)
        # session = cluster.load_session(session_id)

    ### Filter clustering results with chosen_k

    # Step 1: Find the query
    query_params = None
    query_clustering = None
    # If the user provides a choice, check if that choice is valid (corresponds
    # to one of the previous clusterings). Also, check that that choice
    # satisfies the user constraints

    if user_choice is not None and len(prev_choices) > 0:
        user_choice = int(user_choice)
        # In subsequent rounds, the frontend returns the index of the user's choice,
        # and we look up the corresponding parameters.
        query_params = prev_choices[user_choice]
        query_clustering = cluster.load_clustering(query_params)
        if not constraints.satisfies_constraints(query_clustering, same_cluster, diff_cluster):
            print 'Does not satisfy constraints'
            query_params = None
            query_clustering = None

    # If no user choice is provided, find the query clustering by finding the
    # clustering with the highest quality that satisfies the user constraints.
    if query_params is None:
        assert query_clustering is None
        # In the first round, the user's choice is not specified.
        # We use the global best clustering as the query
        best_quality = float('-inf')
        for params in param_vec:
            clustering = cluster.load_clustering(params)

            quality = clustering['quality']
            if quality > best_quality and \
               constraints.satisfies_constraints(clustering, same_cluster, diff_cluster):
                query_params = params
                query_clustering = clustering
                best_quality = quality
    else:
        user_choice = int(user_choice)
        # In subsequent rounds, the frontend returns the index of the user's choice,
        # and we look up the corresponding parameters.
        query_params = prev_choices[user_choice]
        query_clustering = cluster.load_clustering(query_params)

    if query_params is None or query_clustering is None:
        print 'Error: no clustering satisfied these constraints'
        return json.dumps([])

    # Step 2: Run MMR to choose clusterings to show the user.
    param_choices = [query_params]
    clustering_choices = [query_clustering]
    while len(param_choices) < min(len(param_vec), config.NUM_CHOICES):
        best_score = float('-inf')
        for params in param_vec:
            if params not in param_choices:
                clustering = cluster.load_clustering(params)

                quality = clustering['quality']
                dist_vec = min([cluster.clustering_distance(clustering, other_clustering) \
                                for other_clustering in clustering_choices])
                dist_to_closest_clustering = dist_vec
                score = L * quality + (1. - L) * dist_to_closest_clustering
                if score > best_score and \
                   dist_to_closest_clustering > config.MIN_CLUSTERING_DIST and \
                   constraints.satisfies_constraints(clustering, same_cluster, diff_cluster):
                    best_score = score
                    best_params = params
                    best_clustering = clustering
        if best_score == float('-inf'):
            break

        param_choices.append(best_params)
        clustering_choices.append(best_clustering)

    session['choices'] = session.get('choices', []) + [param_choices]
    session['L'] += config.L_INCREMENT
    cluster.save_session(session_id, session)

    # Permute the clusterings so adjacent clusterings are similar
    clustering_choices = permute_clustering.permute_clustering_vec(clustering_choices)
    # clustering_choices = quality_metrics.normalize_clustering_vec(clustering_choices)

    return json.dumps(clustering_choices)


@app.route('/dataset', methods=['POST', 'GET'])
def get_dataset():
    dataset_name = request.args.get('dataset')
    (dataset, description) = cluster.dataset_from_name(dataset_name)
    return json.dumps(dataset.tolist())

def is_float(num):
    return isinstance(num, (np.floating, float))

@app.route('/description', methods=['POST', 'GET'])
def get_description():
    dataset_name = request.args.get('dataset')
    (dataset, description) = cluster.dataset_from_name(dataset_name, include_description=True)
    rounded_description = []
    for d in description:
        rounded_d = {key: '%.1f' % value if is_float(value) else value for (key, value) in d.items()}
        rounded_description.append(rounded_d)
    return json.dumps(rounded_description)

@app.route('/embedding', methods=['POST', 'GET'])
def embedding():
    dataset_name = request.args.get('dataset')
    alg_name = request.args.get('method')
    key = 'embedding/%s_%s' % (dataset_name, alg_name)
    key = str(key)

    env = cluster.get_env()
    with env.begin(write=True) as txn:
        dataset_2d = txn.get(key)
        if dataset_2d is not None:
            return dataset_2d

        if alg_name == 'pca':
            model = sklearn.decomposition.PCA(n_components=2, random_state=0)
        elif alg_name == 'tsne':
            model = sklearn.manifold.TSNE(n_components=2, random_state=0)
        elif alg_name == 'spectral':
            model = sklearn.manifold.SpectralEmbedding(n_components=2, random_state=0)
        elif alg_name == 'mds':
            model = sklearn.manifold.MDS(n_components=2, random_state=0)
        else:
            assert False, 'Unknown embedding algorithm:%s' % alg_name

        (dataset, description) = cluster.dataset_from_name(dataset_name)
        dataset_2d = model.fit_transform(dataset)
        dataset_2d = json.dumps(dataset_2d.tolist())
        txn.put(key, dataset_2d)
        return dataset_2d

@app.route('/superpoint', methods=['POST', 'GET'])
def superpoint():
    clustering_id = request.args.get('clustering_id')
    clustering_id = int(clustering_id)
    max_dist = request.args.get('max_dist', None)
    if max_dist is not None:
        max_dist = float(max_dist)
    d = superpoints.find_superpoints(clustering_id, max_dist=max_dist)
    return json.dumps(d)


if __name__ == '__main__':
    app.run(debug=True)
