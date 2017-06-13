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
import string
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_selection import SelectPercentile
from sklearn.feature_selection import mutual_info_classif
from sklearn.feature_selection import f_classif
from sklearn.feature_selection import chi2

from tqdm import tqdm
from multiprocessing import Pool

def compute_all_clusterings(dataset_name, k_range):
    param_vec = []
    if k_range is None:
        k_range = [2, 20]

    cluster_range = [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20] # [2,4,6,8,10,12,14,16,18,20]: #[2, 3, 5, 8, 13]:

    for n_clusters in cluster_range:
        # KMeans
        if (n_clusters < k_range[0]) or (n_clusters > k_range[1]):
            continue

        params = {
            'alg_name': 'KMeans',
            'n_clusters': n_clusters,
        }
        param_vec.append(params)

        # SpectralClustering
        params = {
            'alg_name': 'SpectralClustering',
            'n_clusters': n_clusters,
            'affinity': 'nearest_neighbors',
        }
        param_vec.append(params)

        # DBSCAN
        # params = {
        #     'alg_name': 'dbscan',
        # }

        params = {
            'alg_name': 'AgglomerativeClustering',
            'n_clusters': n_clusters,
        }

        param_vec.append(params)

    param_vec.append(params)
    new_param_vec = []
    for param in param_vec:
        param['dataset'] = dataset_name
        param['random_seed'] = None
        if config.RANDOM_PERTUBATIONS:
            for random_seed in range(config.NUM_RANDOM_WEIGHTINGS):
                new_param = {key: value for (key, value) in param.items()}
                new_param['random_seed'] = random_seed
                new_param_vec.append(new_param)
    param_vec = param_vec + new_param_vec

    # for param in param_vec:
    #     print param
    #     start = time.time()
    #     compute_clustering(param)
    #     end = time.time()
    #     print 'Duration: %.3f' % (end - start)
    #     print

    if config.PARALLEL:
        pool = Pool()
        pool.map(compute_clustering, param_vec)
    else:
        for params in tqdm(param_vec):
            compute_clustering(params)

    return param_vec

def compute_clustering(params):
    '''
    random weights:
        When using random weightings, only the clustering algorithm sees the perturbed
        dataset. The quality metrics still use the original dataset.
    '''
    env = get_env()
    with env.begin(write=True) as txn:
        clustering_key = clustering_key_from_params(params)
        clustering = txn.get('clusterings/%d' % clustering_key)
        if clustering is not None:
            clustering = json.loads(clustering)
            return clustering

        model = model_from_params(params)
        (pd_dataset, description) = dataset_from_name(params['dataset'], True)
        dataset = pd_dataset.as_matrix()
        if params['random_seed'] is not None:
            np.random.seed(params['random_seed'])
            alpha = config.RANDOM_WEIGHTING_ALPHA
            weights = np.random.dirichlet(alpha * np.ones(dataset.shape[1]))
            labels = model.fit_predict(dataset * weights[None, :])
        else:
            labels = model.fit_predict(dataset)

        # print labels
        # print description[0].keys()

        # X_train, X_test, y_train, y_test = train_test_split(dataset, labels,random_state=0,test_size=1)

        # select = SelectPercentile(f_classif, percentile=50)
        # select.fit(X_train,y_train)
        # # X_train_selected = select.transform(X_train)

        # sorted_labels = sort_labels(dataset, labels)
        # feature_selected_labels = feature_selection_labels(pd_dataset, labels)

        # quality_silhouette = quality_metrics.silhouette_score(dataset, labels)
        # quality_silhouette_clusters = quality_metrics.silhouette_clusters(dataset, labels)
        # quality_silhouette_samples = quality_metrics.silhouette_samples(dataset, labels)

        # quality_calinski_harabaz = quality_metrics.calinski_harabaz_score(dataset, labels)

        # quality_neg_davies_bouldin = quality_metrics.neg_davies_bouldin(dataset, labels)

        # quality_neg_gap_statistic = quality_metrics.neg_gap_statistic(dataset, labels)

        # quality_neg_cohesion = quality_metrics.neg_cohesion(dataset, labels)
        # quality_neg_cohesion_clusters = quality_metrics.neg_cohesion_clusters(dataset, labels)

        # quality_separation = quality_metrics.separation_score(dataset, labels)
        # quality_separation_clusters = quality_metrics.separation_clusters(dataset, labels)

        # quality_min_max_dist = quality_metrics.min_max_dist(dataset, labels)

        # quality_sdbw = quality_metrics.neg_s_Dbw(dataset,labels)

        # n_clusters = n_clusters_from_labels(labels)
        # clustering = {
        #     'quality': quality_sdbw, # quality_silhouette, # backward compatability
        #     'quality_metrics': {

        #         'sdbw': quality_sdbw,
        #         'silhouette_score': quality_silhouette,
        #         'silhouette_clusters': quality_silhouette_clusters,
        #         'silhouette_samples': quality_silhouette_samples,
        #         'calinski_harabaz': quality_calinski_harabaz,
        #         'davies_bouldin': quality_neg_davies_bouldin,
        #         'gap_statistic': quality_neg_gap_statistic,
        #         'cohesion': quality_neg_cohesion,
        #         'cohesion_clusters': quality_neg_cohesion_clusters,
        #         'separation': quality_separation,
        #         'separation_clusters': quality_separation_clusters,
        #         'min_max_dist': quality_min_max_dist,
        #     },
        #     'labels': labels.tolist(),
        #     'n_clusters': n_clusters,
        #     'clustering_parameters': params,
        #     'sorted_labels': sorted_labels,
        #     'cluster_feature_selection': feature_selected_labels,
        #     'clustering_id': clustering_key,
        #     'feature_selection': {
        #         'names': list(pd_dataset.columns.values),
        #         'scores': select.scores_.tolist(),
        #         'pvalues': select.pvalues_.tolist(),
        #     },
        # }
        clustering = build_clustering_object(pd_dataset, labels, params, clustering_key)
        # print(clustering)

        txn.put('clusterings/%d' % clustering_key, json.dumps(clustering))
    return clustering


def build_clustering_object(pd_dataset, labels, params, clustering_key):
    dataset = pd_dataset.as_matrix()
    X_train, X_test, y_train, y_test = train_test_split(dataset, labels,random_state=0,test_size=1)
    select = SelectPercentile(f_classif, percentile=50)
    select.fit(X_train, y_train)

    sorted_labels = sort_labels(dataset, labels)
    feature_selected_labels = feature_selection_labels(pd_dataset, labels)

    quality_silhouette = quality_metrics.silhouette_score(dataset, labels)
    quality_silhouette_clusters = quality_metrics.silhouette_clusters(dataset, labels)
    quality_silhouette_samples = quality_metrics.silhouette_samples(dataset, labels)

    quality_calinski_harabaz = quality_metrics.calinski_harabaz_score(dataset, labels)

    quality_neg_davies_bouldin = quality_metrics.neg_davies_bouldin(dataset, labels)

    quality_neg_gap_statistic = quality_metrics.neg_gap_statistic(dataset, labels)

    quality_neg_cohesion = quality_metrics.neg_cohesion(dataset, labels)
    quality_neg_cohesion_clusters = quality_metrics.neg_cohesion_clusters(dataset, labels)

    quality_separation = quality_metrics.separation_score(dataset, labels)
    quality_separation_clusters = quality_metrics.separation_clusters(dataset, labels)

    quality_min_max_dist = quality_metrics.min_max_dist(dataset, labels)

    quality_sdbw = quality_metrics.neg_s_Dbw(dataset,labels)

    n_clusters = n_clusters_from_labels(labels)

    clustering = {
        'quality': quality_sdbw,
        'quality_metrics': {
        'sdbw': quality_sdbw,
        'silhouette_score': quality_silhouette,
        'silhouette_clusters': quality_silhouette_clusters,
        'silhouette_samples': quality_silhouette_samples,
        'calinski_harabaz': quality_calinski_harabaz,
        'davies_bouldin': quality_neg_davies_bouldin,
        'gap_statistic': quality_neg_gap_statistic,
        'cohesion': quality_neg_cohesion,
        'cohesion_clusters': quality_neg_cohesion_clusters,
        'separation': quality_separation,
        'separation_clusters': quality_separation_clusters,
        'min_max_dist': quality_min_max_dist,
        },
        'labels': labels.tolist(),
        'n_clusters': n_clusters,
        'clustering_parameters': params,
        'sorted_labels': sorted_labels,
        'cluster_feature_selection': feature_selected_labels,
        'clustering_id': clustering_key,
         'feature_selection': {
             'names': list(pd_dataset.columns.values),
             'scores': select.scores_.tolist(),
             'pvalues': select.pvalues_.tolist(),
             },
    }
    return clustering




def model_from_params(params):
    alg_name = params['alg_name']
    if alg_name == 'KMeans':
        return sklearn.cluster.KMeans(n_clusters=params['n_clusters'])
    elif alg_name == 'SpectralClustering':
        return sklearn.cluster.SpectralClustering(n_clusters=params['n_clusters'],
                                                  affinity=params['affinity'])
    elif alg_name == 'dbscan':
        return sklearn.cluster.DBSCAN(min_samples=1)
    elif alg_name == 'AgglomerativeClustering':
        return sklearn.cluster.AgglomerativeClustering(n_clusters=params['n_clusters'])
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

        pd_dataset = pd.DataFrame(data=dataset,columns=["x","y"])

        return (pd_dataset, descriptions)

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

        pd_dataset = pd.DataFrame(data=dataset)

        return (pd_dataset, descriptions)
    # elif dataset_name == 'sequence':
    #     dataset = np.load('data/sequence_data/sequence_data.npy')
    #     if include_description:
    #         with open('data/sequence_data/patient_vec.json') as f:
    #             descriptions = json.load(f)
    #     else:
    #         descriptions = None
    #     return (dataset, descriptions)
    elif dataset_name == 'cars':
        data = np.genfromtxt('data/cars_data/cars.data')
        # Remove rows with nan values
        good_rows = np.all(np.logical_not(np.isnan(data)), axis=1)
        data = data[good_rows]
        col_names = ['miles per gallon', 'cylinders', 'displacement', 'horsepower',\
                     'weight', 'acceleration', 'year', 'origin']

        if include_description:
            descriptions = []
            for row in data:
                d = {}
                for (key, value) in zip(col_names, row):
                    d[key] = value
                descriptions.append(d)
        else:
            descriptions = None

        data -= data.mean(axis=0)[None, :]
        data /= data.std(axis=0)[None, :]

        pd_dataset = pd.DataFrame(data=data,columns=col_names)

        return (pd_dataset, descriptions)

    elif dataset_name == 'cameras':
        data = np.genfromtxt('data/cameras_data/camera.csv', skip_header=2,
                             delimiter=';', usecols=range(1, 13))
        # Remove rows with nan values
        good_rows = np.all(np.logical_not(np.isnan(data)), axis=1)
        data = data[good_rows]
        col_names = ['Model', 'Release date', 'Max resolution', 'Low resolution',
                     'Effective pixels', 'Zoom wide (W)', 'Zoom tele (T)',
                     'Normal focus range', 'Macro focus range', 'Storage included',
                     'Weight (inc. batteries)', 'Dimensions', 'Price']
        if include_description:
            descriptions = []
            for row in data:
                d = {}
                for (key, value) in zip(col_names, row):
                    d[key] = value
                descriptions.append(d)
        else:
            descriptions = None

        data -= data.mean(axis=0)[None, :]
        data /= data.std(axis=0)[None, :]

        pd_dataset = pd.DataFrame(data=data,columns=col_names)

        return (pd_dataset, descriptions)
    elif dataset_name == 'universities':
        # data = np.genfromtxt('data/universities_data/college_rank_2013.csv', dtype=None, skip_header=1, delimiter=',')
        with open('data/universities_data/college_rank_2013.csv') as f:
            line_vec = f.readlines()
        header = line_vec[0].strip().split(',')
        descriptions = []
        data = []
        for line in line_vec[1:]:
            if '"' in line:
                name = line.split('"')[1]
            else:
                name = line.split(',')[0]
            line = line.split('"')[-1] # Remove the university name if in quotes
            tokens = line.split(',')[1:] # Remove the university name
            tokens = map(float, tokens)
            assert len(tokens) == 11

            data.append(tokens[1:]) # Ignore the university same in the first column
            d = dict()
            d[header[0]] = sanitize_string(name)
            for (col_name, col_value) in zip(header[1:], tokens):
                d[col_name] = col_value
            descriptions.append(d)

        data = np.array(data)
        data -= data.mean(axis=0)[None, :]
        data /= data.std(axis=0)[None, :]

        pd_dataset = pd.DataFrame(data=data,columns=header[1:])

        return (data, descriptions)

    elif dataset_name == 'enron':
        with open('data/enron_data/enron.json') as f:
            descriptions = json.load(f)
        data = np.load('data/enron_data/enron.npy').astype(float)
        std = data.std(axis=0)
        data = data[:, std != 0]

        data -= data.mean(axis=0)[None, :]
        data /= data.std(axis=0)[None, :]

        pd_dataset = pd.DataFrame(data=data)
        return (data, descriptions)
    elif dataset_name == 'sutter':
        pdata = pd.read_csv('data/sutter_data/sutter3-15-2017-all.csv')
        data = pdata.as_matrix()
        descriptions = []
        col_names = list(pdata)

        for row in data:
            d = {}
            for (key, value) in zip(col_names, row):
                d[key] = value
            descriptions.append(d)

        return (pdata, descriptions)
    elif dataset_name == 'sutter-temporal':
        pdata = pd.read_csv('data/sutter_temporal_data/sutter3-16-2017-all.csv')
        data = pdata.as_matrix()
        descriptions = []
        col_names = list(pdata)

        for row in data:
            d = {}
            for (key, value) in zip(col_names, row):
                d[key] = value
            descriptions.append(d)

        return (pdata, descriptions)
    elif dataset_name == 'sutter-binary':
        pdata = pd.read_csv('data/sutter_binary_data/sutter3-23-2017-all-binary.csv')
        data = pdata.as_matrix()
        descriptions = []
        col_names = list(pdata)

        for row in data:
            d = {}
            for (key, value) in zip(col_names, row):
                d[key] = value
            descriptions.append(d)

        return (pdata, descriptions)
    elif dataset_name == 'sutter-kenney':
        pdata = pd.read_csv('data/sutter_kenney_data/sutter-kenney6-8-2017-all.csv')
        pdata.drop(pdata.columns[[0,1]], axis=1, inplace=True)

        data = pdata.as_matrix()
        descriptions = []
        col_names = list(pdata)

        for row in data:
            d = {}
            for (key, value) in zip(col_names, row):
                d[key] = value
            descriptions.append(d)

        return (pdata, descriptions)
    elif dataset_name == 'bobross':
        pdata = pd.read_csv('data/bobross_data/elements-by-episode-filtered.csv')

        pdata.drop(pdata.columns[[0,1]], axis=1, inplace=True)

        pdata = pdata.loc[:, (pdata.sum() >= 5)] #remove columns that have been tagged less than 5 times

        # convert to numpy matrix
        matrix = pdata.as_matrix()

        descriptions = []
        col_names = list(pdata)

        for row in matrix:
            d = {}
            for (key, value) in zip(col_names, row):
                d[key] = value
            descriptions.append(d)

        # normalize according to stddev
        # data = whiten(matrix)
        data = matrix
        return (pdata, descriptions)
    else:
        assert False, 'Unknown dataset name'

def clustering_key_from_params(params):
    key_str = ','.join(['%s=%s' % (key, value) for (key, value) in sorted(params.items())])
    key_int = abs(hash(key_str))
    key_int = key_int % (10**config.KEY_NUM_DIGITS)
    return key_int

def sanitize_string(dirty_str):
    clean_str = ''
    for char in dirty_str:
        if char in string.printable:
            clean_str += char
        else:
            clean_str += ' '
    return clean_str

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
        sorted_point_indices = [(index, distance) for (distance, index)
                                in sorted(zip(distance_vec, point_indices))]
        sorted_labels.append(sorted_point_indices)
    return sorted_labels

def feature_selection_labels(pd_dataset, labels):
    '''
    labels - A list of integers with the same size as the data. Each entry indicates to which
             clustering the corresponding point should belong.
    feature_selected_labels -
    '''
    feature_selected_labels = []
    dataset = pd_dataset.as_matrix()
    labels_set = set(labels)
    n_clusters = n_clusters_from_labels(labels)
    for l in labels_set:
        new_labels = pd.Series(labels)
        new_labels.loc[new_labels != l] = "A"
        new_labels.loc[new_labels == l] = "B"
        new_labels[new_labels == "A"] = 0
        new_labels[new_labels == "B"] = 1

        X_train, X_test, y_train, y_test = train_test_split(dataset, new_labels.as_matrix(),random_state=0,test_size=1)
        select = SelectPercentile(f_classif, percentile=50)
        select.fit(X_train,y_train)

        fs = {}
        fs["cluster_label"] = str(l)
        fs["names"] = list(pd_dataset.columns.values)
        fs["scores"] = select.scores_.tolist()
        fs["pvalues"] = select.pvalues_.tolist()

        feature_selected_labels.append(fs)

    return feature_selected_labels

def get_env():
    env = lmdb.open(config.DB_FILENAME, map_size=config.LMDB_MAP_SIZE)
    return env

def load_session(session_id):
    env = get_env()
    with env.begin() as txn:
        session = json.loads(txn.get('sessions/%d' % session_id))
    return session

def save_session(session_id, session):
    env = get_env()
    with env.begin(write=True) as txn:
        txn.put('sessions/%d' % session_id, json.dumps(session))
    # env.sync()

def load_num_sessions():
    env = get_env()
    with env.begin() as txn:
        return int(txn.get('num_sessions', 0))

def save_num_sessions(num_sessions):
    env = get_env()
    with env.begin(write=True) as txn:
        txn.put('num_sessions', str(num_sessions))

def load_clustering(params):
    clustering_key = clustering_key_from_params(params)
    env = get_env()
    with env.begin() as txn:
        return json.loads(txn.get('clusterings/%d' % clustering_key))


if __name__ == '__main__':
    session_id = 3
    session = load_session(session_id)
    session['choices'] = 'This is a test'
    print session.keys()
    save_session(session_id, session)
    del session
    session = load_session(session_id)
    print session.keys()
