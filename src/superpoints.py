import cluster
import config
import json
import lmdb
import numpy as np
import scipy.cluster
import scipy.spatial
import sklearn.metrics

def find_superpoints(clustering_id, max_dist=None):
    if max_dist is None:
        max_dist = 1.0

    env = lmdb.open(config.DB_FILENAME)
    with env.begin(write=True) as txn:
        clustering = txn.get('clusterings/%d' % clustering_id)

        assert clustering is not None
        clustering = json.loads(clustering)

    labels = np.array(clustering['labels'])
    dataset_name = clustering['clustering_parameters']['dataset']
    (dataset, description) = cluster.dataset_from_name(dataset_name)

    d = {'superpoint': [], 'size': [], 'children': []}
    for cluster_index in sorted(set(labels)):
        subset_indices = np.where(labels == cluster_index)[0]
        dataset_subset = dataset[subset_indices]
        if len(subset_indices) == 1:
            d['superpoint'].append(subset_indices[0])
            d['size'].append(1)
            d['children'].extend(subset_indices)
        else:
            pdist = scipy.spatial.distance.pdist(dataset_subset)
            Z = scipy.cluster.hierarchy.linkage(pdist, method='average', metric='euclidean')
            y = scipy.cluster.hierarchy.fcluster(Z, max_dist, criterion='distance') - 1

            num_clusters = len(set(y))
            centers = np.array([dataset_subset[y == label].mean(axis=0) for label in range(num_clusters)])
            indices = sklearn.metrics.pairwise_distances_argmin(centers, dataset_subset)

            center_indices = subset_indices[indices]
            d['superpoint'].extend(center_indices)

            weights = [np.sum(y == tmp_cluster_index) for tmp_cluster_index in range(num_clusters)]
            children = [subset_indices[y == temp_cluster_index].tolist() for temp_cluster_index in range(num_clusters)]
            d['size'].extend(weights)
            d['children'].extend(children)
    return d
