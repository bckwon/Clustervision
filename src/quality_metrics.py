import numpy as np
import sklearn.metrics
import clusterhelpers_db_gs

def silhouette_score(X, labels):
    return sklearn.metrics.silhouette_score(X, labels)

def silhouette_samples(X, labels):
    return sklearn.metrics.silhouette_samples(X, labels).tolist()

def silhouette_clusters(X, labels):
    sample_scores = silhouette_samples(X, labels)
    return [np.array(sample_scores)[labels == n].mean() for n in sorted(set(labels))]

def neg_davies_bouldin(X, labels):
    return -1.0 * clusterhelpers_db_gs.davies_bouldin(X, labels)

def calinski_harabaz_score(X, labels):
    return sklearn.metrics.calinski_harabaz_score(X, labels)

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
        # extra_disp += len(cluster_k) * np.sum((mean_k - mean) ** 2)
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

def normalize_clustering_vec(clustering_vec):
    min_dict = dict()
    max_dict = dict()
    for clustering in clustering_vec:
        for (quality_metric_name, quality_score) in clustering['quality_metrics'].items():
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

