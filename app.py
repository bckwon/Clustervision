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

from flask import Flask, request, render_template
from multiprocessing import Pool
from src import clusterhelpers_db_gs, cluster, config, permute_clustering

app = Flask(__name__)

@app.route('/')
def index():
	return render_template('index.html', data=[])

@app.route('/new_session', methods=['POST', 'GET'])
def new_session():
    env = lmdb.open(config.DB_FILENAME)
    with env.begin(write=True) as txn:
        num_sessions = txn.get('num_sessions')
        if num_sessions is None:
            num_sessions = 0
        else:
            num_sessions = int(num_sessions)
        session_id = num_sessions


        dataset_name = request.args.get('dataset')
        session = {'dataset': dataset_name,
                   'L': config.L_INITIAL }
        txn.put('sessions/%d' % session_id, json.dumps(session))

    param_vec = cluster.compute_all_clusterings(dataset_name)

    with env.begin(write=True) as txn:
        session = json.loads(txn.get('sessions/%d' % session_id))
        session['param_vec'] = param_vec
        txn.put('sessions/%d' % session_id, json.dumps(session))

        num_sessions += 1
        txn.put('num_sessions', str(num_sessions))

    return json.dumps(session_id)

@app.route('/clustering', methods=['POST', 'GET'])
def get_clustering():
    env = lmdb.open(config.DB_FILENAME)
    with env.begin(write=True) as txn:
        session_id = int(request.args.get('session_id'))
        user_choice = request.args.get('user_choice')
        session = json.loads(txn.get('sessions/%d' % session_id))
        param_vec = session['param_vec']
        L = session['L']
        if 'choices' in session.keys():
            prev_choices = session['choices'][-1]
        else:
            prev_choices = []

        # Step 1: Find the query
        if user_choice is None or len(prev_choices) == 0:
            # In the first round, the user's choice is not specified.
            # We use the global best clustering as the query
            best_quality = float('-inf')
            for params in param_vec:
                clustering_key = cluster.clustering_key_from_params(params)
                clustering = json.loads(txn.get('clusterings/%d' % clustering_key))
                quality = clustering['quality']
                if quality > best_quality:
                    query_params = params
                    query_clustering = clustering
                    best_quality = quality
        else:
            user_choice = int(user_choice)
            # In subsequent rounds, the frontend returns the index of the user's choice,
            # and we look up the corresponding parameters.
            query_params = prev_choices[user_choice]
            clustering_key = cluster.clustering_key_from_params(query_params)
            query_clustering = json.loads(txn.get('clusterings/%d' % clustering_key))

        # Step 2: Run MMR to choose clusterings to show the user.
        param_choices = [query_params]
        clustering_choices = [query_clustering]
        while len(param_choices) < config.NUM_CHOICES:
            best_score = float('-inf')
            for params in param_vec:
                if params not in param_choices:
                    clustering_key = cluster.clustering_key_from_params(params)
                    clustering = json.loads(txn.get('clusterings/%d' % clustering_key))
                    quality = clustering['quality']
                    dist_to_closest_clustering = min([cluster.clustering_distance(clustering, other_clustering) for other_clustering in clustering_choices])
                    score = L * quality + (1. - L) * dist_to_closest_clustering
                    if score > best_score:
                        best_score = score
                        best_params = params
                        best_clustering = clustering
            param_choices.append(best_params)
            clustering_choices.append(best_clustering)

        session['choices'] = session.get('choices', []) + [param_choices]
        session['L'] += config.L_INCREMENT
        txn.put('sessions/%d' % session_id, json.dumps(session))

    # Permute the clusterings so adjacent clusterings are similar
    permuted_clustering_choices = permute_clustering.permute_clustering_vec(clustering_choices)
    return json.dumps(permuted_clustering_choices)


@app.route('/dataset', methods=['POST', 'GET'])
def get_dataset():
    dataset_name = request.args.get('dataset')
    (dataset, description) = cluster.dataset_from_name(dataset_name)
    return json.dumps(dataset.tolist())

@app.route('/description', methods=['POST', 'GET'])
def get_description():
    dataset_name = request.args.get('dataset')
    (dataset, description) = cluster.dataset_from_name(dataset_name, include_description=True)
    return json.dumps(description)

@app.route('/embedding', methods=['POST', 'GET'])
def embedding():
    dataset_name = request.args.get('dataset')
    alg_name = request.args.get('method')
    (dataset, description) = cluster.dataset_from_name(dataset_name)
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

    dataset_2d = model.fit_transform(dataset)
    return json.dumps(dataset_2d.tolist())

if __name__ == '__main__':
    app.run(debug=True)
