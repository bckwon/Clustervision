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

    key = 'superpoints/%d_%f' % (clustering_id, max_dist)

    env = lmdb.open(config.DB_FILENAME, map_size=config.LMDB_MAP_SIZE)

    with env.begin(write=True) as txn:
        d = txn.get(key)
        if d is not None:
            d = json.loads(d)
            return d

    with env.begin(write=True) as txn:
        clustering = txn.get('clusterings/%d' % clustering_id)

        assert clustering is not None
        clustering = json.loads(clustering)

    labels = np.array(clustering['labels'])
    dataset_name = clustering['clustering_parameters']['dataset']
    (pd_dataset, description) = cluster.dataset_from_name(dataset_name)

    dataset = pd_dataset.as_matrix()

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

            # Subtract epsilon from the maximum distance to handle identical points.
            # If there are identical points, using max_dist=0 will still cluster these
            # points together.

            y = scipy.cluster.hierarchy.fcluster(Z, max_dist - 1e-8, criterion='distance') - 1
            num_clusters = len(set(y))
            assert range(num_clusters) == sorted(set(y))

            centers = np.array([dataset_subset[y == label].mean(axis=0) for label in range(num_clusters)])
            indices = sklearn.metrics.pairwise_distances_argmin(centers, dataset_subset)

            center_indices = subset_indices[indices]
            d['superpoint'].extend(center_indices)

            children = [subset_indices[y == label].tolist() for label in range(num_clusters)]
            sizes = map(len, children)


            d['size'].extend(sizes)
            d['children'].extend(children)

    with env.begin(write=True) as txn:
        txn.put(key, json.dumps(d))

    return d
