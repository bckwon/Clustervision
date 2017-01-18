#! /bin/python

"""
Cluster Analysis
Desription: This tool helps users find a good clustering of their data. Clustering can be helpful for summarizing data and making it more interpretable.
Contributers: BC Kwon, Ben Eysenbach
Documentation: https://ibm.ent.box.com/notes/123647604541

Created on 01/17/2017
"""

from python import clusterhelpers_db_gs
import csv
import datetime
from flask import Flask, request, redirect, url_for, send_from_directory, render_template
import json
import numpy as np
import os
import pickle
import scipy.spatial.distance
import sklearn
import sklearn.metrics
import sklearn.cluster
import sklearn.datasets
from tqdm import tqdm, trange
from werkzeug import secure_filename


DB_FILENAME = 'db.json'     # Database filename
NUM_CHOICES = 3             # How many clusterings to show the user (including the previous best)
L_INITIAL = 0.5             # Initial value for MMR parameter lambda
L_INCREMENT = 0.1           # L increases by this amount after each round.

app = Flask(__name__)

@app.route('/')
def index():
	return render_template('index.html', data=[])
	# data = json.dumps({'name': 'sample', 'data': [0,1,2,3]})
	# return render_template('index.html', data=data)


@app.route('/new_session', methods=['POST', 'GET'])
def new_session():
    if not os.path.exists(DB_FILENAME):
        d = {
            'sessions': {'num_sessions': 0},
            'clusterings': {}
            }

        with open(DB_FILENAME, 'wb') as f:
            json.dump(d, f)
    else:
        with open(DB_FILENAME) as f:
            d = json.load(f)

    session_id = d['sessions']['num_sessions']
    dataset_name = request.args.get('dataset')

    # The function compute_all_clusterings modifies the DB, so we need to make sure that
    # we don't have a copy of the DB open when calling this function.
    del d
    param_vec = compute_all_clusterings(dataset_name)
    with open(DB_FILENAME) as f:
        d = json.load(f)


    d['sessions'][session_id] = {
        'dataset': dataset_name,
        'param_vec': param_vec,
        'L': L_INITIAL
    }
    d['sessions']['num_sessions'] += 1

    with open(DB_FILENAME, 'wb') as f:
        json.dump(d, f)
    return json.dumps(session_id)

@app.route('/clustering', methods=['POST', 'GET'])
def clustering():
    with open(DB_FILENAME) as f:
        d = json.load(f)

    session_id = request.args.get('session_id')
    user_choice = request.args.get('user_choice', None)
    param_vec = d['sessions'][session_id]['param_vec']
    L = d['sessions'][session_id]['L']
    if 'choices' in d['sessions'][session_id].keys():
        prev_choices = d['sessions'][session_id]['choices'][-1]
    else:
        prev_choices = []

    # Step 1: Find the query
    if user_choice is None or len(prev_choices) == 0:
        # In the first round, the user's choice is not specified.
        # We use the global best clustering as the query
        best_quality = float('-inf')
        for params in param_vec:
            clustering_key = clustering_key_from_params(params)
            clustering = d['clusterings'][clustering_key]
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
        clustering_key = clustering_key_from_params(query_params)
        query_clustering = d['clusterings'][clustering_key]

    # Step 2: Run MMR to choose clusterings to show the user.
    param_choices = [query_params]
    clustering_choices = [query_clustering]
    while len(param_choices) < NUM_CHOICES:
        best_score = float('-inf')
        for params in param_vec:
            if params not in param_choices:
                clustering_key = clustering_key_from_params(params)
                clustering = d['clusterings'][clustering_key]
                quality = clustering['quality']
                dist_to_closest_clustering = min([clustering_distance(clustering, other_clustering) for other_clustering in clustering_choices])
                score = L * quality + (1. - L) * dist_to_closest_clustering
                if score > best_score:
                    best_score = score
                    best_params = params
                    best_clustering = clustering
        param_choices.append(best_params)
        clustering_choices.append(best_clustering)


    d['sessions'][session_id]['choices'] = d['sessions'][session_id].get('choices', []) + [param_choices]
    d['sessions'][session_id]['L'] += L_INCREMENT

    with open(DB_FILENAME, 'wb') as f:
        json.dump(d, f)

    return json.dumps(clustering_choices)


@app.route('/dataset', methods=['POST', 'GET'])
def dataset():
    dataset_name = request.args.get('dataset')
    dataset = dataset_from_name(dataset_name).tolist()
    return json.dumps(dataset)

def compute_all_clusterings(dataset_name):
    param_vec = []
    for n_clusters in trange(2, 20):
        # KMeans
        params = {
            'alg_name': 'KMeans',
            'dataset': dataset_name,
            'n_clusters': n_clusters,
        }
        compute_clustering(params)
        param_vec.append(params)

        # SpectralClustering
        for affinity in ['nearest_neighbors']:
            params = {
                'alg_name': 'SpectralClustering',
                'dataset': dataset_name,
                'n_clusters': n_clusters,
                'affinity': affinity,
            }
            compute_clustering(params)
            param_vec.append(params)

    # for eps in range(0, 2, 0.3):
    #     params = {
    #         'alg_name': 'dbscan',
    #         'dataset': dataset_name,
    #         'eps': eps,
    #     }
    return param_vec

def compute_clustering(params):
    with open(DB_FILENAME) as f:
        d = json.load(f)
    clustering_key = clustering_key_from_params(params)
    if clustering_key in d['clusterings'].keys():
        return d['clusterings'][clustering_key]
    model = model_from_params(params)
    dataset = dataset_from_name(params['dataset'])
    labels = model.fit_predict(dataset)
    sorted_labels = sort_labels(dataset, labels)

    quality_silhouette = sklearn.metrics.silhouette_score(dataset, labels)
    quality_calinski_harabaz = sklearn.metrics.calinski_harabaz_score(dataset, labels)
    quality_davies_bouldin = clusterhelpers_db_gs.davies_bouldin(dataset, labels)

    n_clusters = n_clusters_from_labels(labels)
    clustering = {
        'quality': quality_silhouette, # backward compatability
        'quality_metrics': {
            'silhouette_score': quality_silhouette,
            'calinski_harabaz': quality_calinski_harabaz,
            'davies_bouldin': quality_davies_bouldin,
        },
        'labels': labels.tolist(),
        'n_clusters': n_clusters,
        'clustering_parameters': params,
        'sorted_labels': sorted_labels
    }
    d['clusterings'][clustering_key] = clustering

    with open(DB_FILENAME, 'wb') as f:
        json.dump(d, f)

    return clustering

def model_from_params(params):
    alg_name = params['alg_name']
    if alg_name == 'KMeans':
        return sklearn.cluster.KMeans(n_clusters=params['n_clusters'])
    elif alg_name == 'SpectralClustering':
        return sklearn.cluster.SpectralClustering(n_clusters=params['n_clusters'], affinity=params['affinity'])
    # elif alg_name == 'dbscan':
    #     return sklearn.cluster.DBSCAN(eps=params['eps'], min_samples=params['min_samples'])
    else:
        assert False, 'Unknown clustering algorithn name'

def n_clusters_from_labels(labels):
    return len(set(labels))

def dataset_from_name(dataset_name):
    if dataset_name == 'blobs':
         return sklearn.datasets.make_blobs(n_samples=500,
                                            n_features=2,
                                            centers=4,
                                            cluster_std=1,
                                            center_box=(-10.0, 10.0),
                                            shuffle=True,
                                            random_state=1)[0]
    elif dataset_name == 'digits':
        return sklearn.datasets.load_digits(return_X_y=True)[0]
    elif dataset_name == 'sequence':
        with open( "sequence_data/cluster_dump.pickle", "rb" )  as f:
            output = pickle.load(f)
        patient_id_list = [' '.join(row) for row in output]
        vectorizer = sklearn.feature_extraction.text.CountVectorizer()
        pattern_vectors = vectorizer.fit_transform(patient_id_list)
        pattern_vectors = pattern_vectors.toarray()
        return pattern_vectors
    else:
        assert False, 'Unknown dataset name'

def clustering_key_from_params(params):
    return ','.join(['%s=%s' % (key, value) for (key, value) in sorted(params.items())])

def clustering_distance(clustering_1, clustering_2):
    adj_1 = adj_from_labels(clustering_1['labels'])
    adj_2 = adj_from_labels(clustering_2['labels'])
    return np.mean(adj_1 != adj_2)

def adj_from_labels(labels):
    labels = np.array(labels).flatten()
    return (labels[:, None] == labels[None, :])

def sort_labels(dataset, labels, distance_metric=scipy.spatial.distance.euclidean):
    '''
    labels - A list of integers with the same size as the data. Each entry indicates to which
             clustering the corresponding point should belong.
    sorted_labels - List of list of integers. The i-th list stores the indices of points belonging
                    to cluster i. Within this list, points are sorted by their distance from the
                    cluster centroid, with closest points first. Thus, the first points are the
                    inliers and the last points are the outliers.
    '''
    sorted_labels = []
    n_clusters = n_clusters_from_labels(labels)
    for cluster_index in range(n_clusters):
        distance_vec = []
        point_indices = [index for (index, cluster_label) in enumerate(labels) if cluster_label == cluster_index]
        for index_1 in point_indices:
            pt_1 = dataset[index_1]
            distance_vec_for_point = []
            for index_2 in point_indices:
                pt_2 = dataset[index_2]
                distance_vec_for_point.append(distance_metric(pt_1, pt_2))
            distance_vec.append(np.mean(distance_vec_for_point))
        sorted_point_indices = [index for (distance, index) in sorted(zip(distance_vec, point_indices))]
        sorted_labels.append(sorted_point_indices)
    return sorted_labels

if __name__ == '__main__':
    app.run(debug=True)
