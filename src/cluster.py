#! /bin/python

"""
Cluster Analysis
Desription: This tool helps users find a good clustering of their data.
Clustering can be helpful for summarizing data and making it more interpretable.
Contributers: BC Kwon, Ben Eysenbach
Documentation: https://ibm.ent.box.com/notes/123647604541

Created on 01/17/2017
"""

import config
import clusterhelpers_db_gs
import json
import lmdb
import numpy as np
import quality_metrics
import sklearn
import sklearn.cluster
import sklearn.datasets
import sklearn.manifold
import sklearn.metrics
import sklearn.preprocessing

from multiprocessing import Pool

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

    # pool = Pool()
    map(compute_clustering, param_vec)

    return param_vec

def compute_clustering(params):
    env = lmdb.open(config.DB_FILENAME)
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

        quality_silhouette = quality_metrics.silhouette_score(dataset, labels)
        quality_silhouette_clusters = quality_metrics.silhouette_clusters(dataset, labels)
        quality_silhouette_samples = quality_metrics.silhouette_samples(dataset, labels)

        quality_calinski_harabaz = quality_metrics.calinski_harabaz_score(dataset, labels)

        quality_neg_davies_bouldin = quality_metrics.neg_davies_bouldin(dataset, labels)

        quality_neg_cohesion = quality_metrics.neg_cohesion(dataset, labels)
        quality_neg_cohesion_clusters = quality_metrics.neg_cohesion_clusters(dataset, labels)

        quality_separation = quality_metrics.separation_score(dataset, labels)
        quality_separation_clusters = quality_metrics.separation_clusters(dataset, labels)

        n_clusters = n_clusters_from_labels(labels)
        clustering = {
            'quality': quality_silhouette, # backward compatability
            'quality_metrics': {
                'silhouette_score': quality_silhouette,
                'silhouette_clusters': quality_silhouette_clusters,
                'silhouette_samples': quality_silhouette_samples,
                'calinski_harabaz': quality_calinski_harabaz,
                'davies_bouldin': quality_neg_davies_bouldin,
                'cohesion': quality_neg_cohesion,
                'cohesion_clusters': quality_neg_cohesion_clusters,
                'separation': quality_separation,
                'separation_clusters': quality_separation_clusters
            },
            'labels': labels.tolist(),
            'n_clusters': n_clusters,
            'clustering_parameters': params,
            'sorted_labels': sorted_labels,
            'clustering_id': clustering_key
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
        if include_description:
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
        if include_description:
            descriptions = []
            col_names = ['miles per gallon', 'cylinders', 'displacement', 'horsepower', 'weight', 'acceleration', 'year', 'origin']
            for row in data:
                d = {}
                for (key, value) in zip(col_names[:-1], row[:-1]): # Don't include origin because we don't know what it means
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
        if include_description:
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
        sorted_point_indices = [(index, distance) for (distance, index) in sorted(zip(distance_vec, point_indices))]
        sorted_labels.append(sorted_point_indices)
    return sorted_labels

if __name__ == '__main__':
    pass
