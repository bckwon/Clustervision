import numpy as np
import sklearn.metrics
import clusterhelpers_db_gs

def silhouette_score(X, labels):
    n_labels = len(set(labels))
    n_samples = X.shape[0]
    if 2 <= n_labels  and n_labels <= n_samples - 1:
        return sklearn.metrics.silhouette_score(X, labels)
    else:
        return -1

def silhouette_samples(X, labels):
    n_labels = len(set(labels))
    n_samples = X.shape[0]
    if 2 <= n_labels  and n_labels <= n_samples - 1:
        return sklearn.metrics.silhouette_samples(X, labels).tolist()
    else:
        return [-1 for _ in labels]


def silhouette_clusters(X, labels):
    sample_scores = silhouette_samples(X, labels)
    return [np.array(sample_scores)[labels == n].mean() for n in sorted(set(labels))]

def neg_davies_bouldin(X, labels):
    return -1.0 * clusterhelpers_db_gs.davies_bouldin(X, labels)

def calinski_harabaz_score(X, labels):
    n_labels = len(set(labels))
    n_samples = X.shape[0]
    if 2 <= n_labels  and n_labels <= n_samples - 1:
        return sklearn.metrics.calinski_harabaz_score(X, labels)
    else:
        return float('-inf')

def neg_cohesion(X, labels):
    le = sklearn.preprocessing.LabelEncoder()
    labels = le.fit_transform(labels)

    n_samples, _ = X.shape
    n_labels = len(le.classes_)

    cohesion = 0
    mean = np.mean(X, axis=0)
    for k in range(n_labels):
        cluster_k = X[labels == k]
        mean_k = np.mean(cluster_k, axis=0)
        cohesion += np.sum((cluster_k - mean_k) ** 2)

    cohesion /= n_samples

    var = np.var(X)
    cohesion /= var
    neg_cohesion = -1.0 * cohesion

    return neg_cohesion

def neg_cohesion_clusters(X, labels):
    return [-1 * np.var(X[labels == k]) for k in sorted(set(labels))]

def separation_score(X, labels):
    le = sklearn.preprocessing.LabelEncoder()
    labels = le.fit_transform(labels)

    n_samples, _ = X.shape
    n_labels = len(le.classes_)

    separation = 0
    mean = np.mean(X, axis=0)
    for k in range(n_labels):
        cluster_k = X[labels == k]
        mean_k = np.mean(cluster_k, axis=0)
        separation += len(cluster_k) * np.sum((mean_k - mean) ** 2)

    separation /= n_samples
    return separation

def separation_clusters(X, labels):
    le = sklearn.preprocessing.LabelEncoder()
    labels = le.fit_transform(labels)
    n_labels = len(le.classes_)

    separation_vec = []
    mean = np.mean(X, axis=0)
    for k in range(n_labels):
        cluster_k = X[labels == k]
        mean_k = np.mean(cluster_k, axis=0)
        separation_vec.append(np.sum((mean_k - mean) ** 2))

    return separation_vec

def min_max_dist(X, labels):
    '''Minimum and maximum distance between two points belonging to the same cluster'''
    min_vec = []
    max_vec = []
    for cluster_index in sorted(set(labels)):
        X_subset = X[labels == cluster_index]
        pdist = sklearn.metrics.pairwise_distances(X_subset)
        values = pdist.flatten()
        if len(values) > 1:
            max_vec.append(sorted(values)[-2])
        else:
            max_vec.append(values[0])
        n = X_subset.shape[0]
        # Handle the zeros on the diagonal
        pdist[range(n), range(n)] = float('inf')
        min_vec.append(pdist.min())
    return (min(min_vec), max(max_vec))

def normalize_clustering_vec(clustering_vec):
    min_dict = dict()
    max_dict = dict()
    for clustering in clustering_vec:
        for (quality_metric_name, quality_score) in clustering['quality_metrics'].items():
            if 'silhouette_score' == quality_metric_name:
                print quality_metric_name, quality_score
            try:
                min_score = min(quality_score)
                max_score = max(quality_score)
            except TypeError:
                min_score = quality_score
                max_score = quality_score
            min_dict[quality_metric_name] = min([min_dict.get(quality_metric_name, float('inf')), min_score])
            max_dict[quality_metric_name] = max([max_dict.get(quality_metric_name, float('-inf')), max_score])

    for clustering in clustering_vec:
        for (quality_metric_name, quality_score) in clustering['quality_metrics'].items():
            min_score = float(min_dict[quality_metric_name])
            max_score = float(max_dict[quality_metric_name])
            try:
                quality_score = [(score - min_score) / (max_score - min_score) for score in quality_score]
            except TypeError:
                quality_score = (quality_score - min_score) / (max_score - min_score)
            clustering['quality_metrics'][quality_metric_name] = quality_score

    return clustering_vec

