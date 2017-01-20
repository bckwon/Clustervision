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

from flask import Flask, request, render_template
from multiprocessing import Pool
from python import clusterhelpers_db_gs

DB_FILENAME = 'db.lmdb'     # Database filename
NUM_CHOICES = 3             # How many clusterings to show the user (including the previous best)
L_INITIAL = 0.5             # Initial value for MMR parameter lambda
L_INCREMENT = 0.1           # L increases by this amount after each round.

app = Flask(__name__)

@app.route('/')
def index():
	return render_template('index.html', data=[])

@app.route('/new_session', methods=['POST', 'GET'])
def new_session():
    env = lmdb.open(DB_FILENAME)
    with env.begin(write=True) as txn:
        num_sessions = txn.get('num_sessions')
        if num_sessions is None:
            num_sessions = 0
        else:
            num_sessions = int(num_sessions)
        session_id = num_sessions


        dataset_name = request.args.get('dataset')
        session = {'dataset': dataset_name,
                   'L': L_INITIAL }
        txn.put('sessions/%d' % session_id, json.dumps(session))

    param_vec = compute_all_clusterings(dataset_name)

    with env.begin(write=True) as txn:
        session = json.loads(txn.get('sessions/%d' % session_id))
        session['param_vec'] = param_vec
        txn.put('sessions/%d' % session_id, json.dumps(session))

        num_sessions += 1
        txn.put('num_sessions', str(num_sessions))

    return json.dumps(session_id)

@app.route('/clustering', methods=['POST', 'GET'])
def get_clustering():
    env = lmdb.open(DB_FILENAME)
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
                clustering_key = clustering_key_from_params(params)
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
            clustering_key = clustering_key_from_params(query_params)
            query_clustering = json.loads(txn.get('clusterings/%d' % clustering_key))

        # Step 2: Run MMR to choose clusterings to show the user.
        param_choices = [query_params]
        clustering_choices = [query_clustering]
        while len(param_choices) < NUM_CHOICES:
            best_score = float('-inf')
            for params in param_vec:
                if params not in param_choices:
                    clustering_key = clustering_key_from_params(params)
                    clustering = json.loads(txn.get('clusterings/%d' % clustering_key))
                    quality = clustering['quality']
                    dist_to_closest_clustering = min([clustering_distance(clustering, other_clustering) for other_clustering in clustering_choices])
                    score = L * quality + (1. - L) * dist_to_closest_clustering
                    if score > best_score:
                        best_score = score
                        best_params = params
                        best_clustering = clustering
            param_choices.append(best_params)
            clustering_choices.append(best_clustering)

        session['choices'] = session.get('choices', []) + [param_choices]
        session['L'] += L_INCREMENT
        txn.put('sessions/%d' % session_id, json.dumps(session))

    return json.dumps(clustering_choices)


@app.route('/dataset', methods=['POST', 'GET'])
def get_dataset():
    dataset_name = request.args.get('dataset')
    (dataset, description) = dataset_from_name(dataset_name)
    return json.dumps(dataset.tolist())

@app.route('/description', methods=['POST', 'GET'])
def get_description():
    dataset_name = request.args.get('dataset')
    (dataset, description) = dataset_from_name(dataset_name, include_description=True)
    return json.dumps(description)

@app.route('/embedding', methods=['POST', 'GET'])
def embedding():
    dataset_name = request.args.get('dataset')
    alg_name = request.args.get('method')
    (dataset, description) = dataset_from_name(dataset_name)
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

def compute_all_clusterings(dataset_name):
    param_vec = []
    for n_clusters in [2, 3, 5, 8, 13]:
        # KMeans
        params = {
            'alg_name': 'KMeans',
            'dataset': dataset_name,
            'n_clusters': n_clusters,
        }
        param_vec.append(params)

        # SpectralClustering
        params = {
            'alg_name': 'SpectralClustering',
            'dataset': dataset_name,
            'n_clusters': n_clusters,
            'affinity': 'nearest_neighbors',
        }
        param_vec.append(params)

    # DBSCAN
    params = {
        'alg_name': 'dbscan',
        'dataset': dataset_name,
    }
    param_vec.append(params)

    # for param in param_vec:
    #     print param
    #     start = time.time()
    #     compute_clustering(param)
    #     end = time.time()
    #     print 'Duration: %.3f' % (end - start)
    #     print
    pool = Pool()
    pool.map(compute_clustering, param_vec)

    return param_vec

def compute_clustering(params):
    env = lmdb.open(DB_FILENAME)
    with env.begin(write=True) as txn:
        clustering_key = clustering_key_from_params(params)
        clustering = txn.get('clusterings/%d' % clustering_key)
        if clustering is not None:
            clustering = json.loads(clustering)
            return clustering

        model = model_from_params(params)
        (dataset, description) = dataset_from_name(params['dataset'])
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
        txn.put('clusterings/%d' % clustering_key, json.dumps(clustering))

        return clustering

def model_from_params(params):
    alg_name = params['alg_name']
    if alg_name == 'KMeans':
        return sklearn.cluster.KMeans(n_clusters=params['n_clusters'])
    elif alg_name == 'SpectralClustering':
        return sklearn.cluster.SpectralClustering(n_clusters=params['n_clusters'], affinity=params['affinity'])
    elif alg_name == 'dbscan':
        return sklearn.cluster.DBSCAN(min_samples=1)
    else:
        assert False, 'Unknown clustering algorithn name'

def n_clusters_from_labels(labels):
    return len(set(labels))

def dataset_from_name(dataset_name, include_description=False):
    if dataset_name == 'blobs':
        (dataset, labels) = sklearn.datasets.make_blobs(n_samples=500,
                                                        n_features=2,
                                                        centers=4,
                                                        cluster_std=1,
                                                        center_box=(-10.0, 10.0),
                                                        shuffle=True,
                                                        random_state=1)
        if include_description:
            descriptions = [{'label': l, 'x': x, 'y': y} for ((x, y), l) in zip(dataset, labels)]
        else:
            descriptions = None
        return (dataset, descriptions)

    elif dataset_name == 'digits':
        (dataset, labels) = sklearn.datasets.load_digits(return_X_y=True)
        if include_descriptions:
            descriptions = []
            for (img, l) in zip(dataset, labels):
                brightness = img.mean()
                contrast = img.std()
                d = {
                    'label': l,
                    'brightness': brightness,
                    'contrast': contrast
                }
                descriptions.append(d)
        else:
            descriptions = None
        return (dataset, descriptions)
    elif dataset_name == 'sequence':
        dataset = np.load('data/sequence_data/sequence_data.npy')
        if include_description:
            with open('data/sequence_data/patient_vec.json') as f:
                descriptions = json.load(f)
        else:
            descriptions = None
        return (dataset, descriptions)
    elif dataset_name == 'cars':
        data = np.genfromtxt('data/cars_data/cars.data')
        # Remove rows with nan values
        good_rows = np.all(np.logical_not(np.isnan(data)), axis=1)
        data = data[good_rows]
        if include_descriptions:
            descriptions = []
            col_names = ['miles per gallon', 'cylinders', 'displacement', 'horsepower', 'weight', 'acceleration', 'year', 'origin']
            for row in data:
                d = {}
                for (key, value) in zip(row[:-1], col_names[:-1]): # Don't include origin because we don't know what it means
                    d[key] = value
                descriptions.append(d)
        else:
            descriptions = None

        data -= data.mean(axis=0)[None, :]
        data /= data.std(axis=0)[None, :]
        return (data, descriptions)

    elif dataset_name == 'cameras':
        data = np.genfromtxt('data/cameras_data/camera.csv', skip_header=2, delimiter=';', usecols=range(1, 13))
        # Remove rows with nan values
        good_rows = np.all(np.logical_not(np.isnan(data)), axis=1)
        data = data[good_rows]
        if include_descriptions:
            descriptions = []
            col_names = ['Model', 'Release date', 'Max resolution', 'Low resolution', 'Effective pixels',
                         'Zoom wide (W)', 'Zoom tele (T)', 'Normal focus range', 'Macro focus range',
                         'Storage included', 'Weight (inc. batteries)', 'Dimensions', 'Price']
            for row in data:
                d = {}
                for (key, value) in zip(row, col_names):
                    d[key] = value
                descriptions.append(d)
        else:
            descriptions = None

        data -= data.mean(axis=0)[None, :]
        data /= data.std(axis=0)[None, :]
        return (data, descriptions)
    else:
        assert False, 'Unknown dataset name'

def clustering_key_from_params(params):
    key_str = ','.join(['%s=%s' % (key, value) for (key, value) in sorted(params.items())])
    key_int = abs(hash(key_str))
    return key_int

def clustering_distance(clustering_1, clustering_2):
    adj_1 = adj_from_labels(clustering_1['labels'])
    adj_2 = adj_from_labels(clustering_2['labels'])
    return np.mean(adj_1 != adj_2)

def adj_from_labels(labels):
    labels = np.array(labels).flatten()
    return (labels[:, None] == labels[None, :])

def sort_labels(dataset, labels):
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
        center = dataset[labels == cluster_index].mean(0)
        distance_vec = np.linalg.norm(dataset[labels == cluster_index] - center[None, :], axis=1)
        point_indices = np.where(labels == cluster_index)[0]
        sorted_point_indices = [index for (distance, index) in sorted(zip(distance_vec, point_indices))]
        sorted_labels.append(sorted_point_indices)
    return sorted_labels

if __name__ == '__main__':
    app.run(debug=True)
