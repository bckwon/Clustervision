#!/bin/python
import numpy as np
import networkx as nx

def permute_clustering_vec(clustering_vec):
    new_clustering_vec = [clustering_vec[0]]
    for clustering in clustering_vec[1:]:
        best_prev_clustering = sorted([(abs(clustering['n_clusters'] - tmp_clustering['n_clusters']), tmp_clustering) for tmp_clustering in new_clustering_vec])

        prev_labels = best_prev_clustering[0][1]['labels']
        (clustering['labels'], clustering['sorted_labels']) = permute_clustering(clustering['labels'], prev_labels, sorted_labels=clustering['sorted_labels'])
        new_clustering_vec.append(clustering)
    return new_clustering_vec

def permute_clustering(a, b, sorted_labels=None):
    '''Permutes the labels in clustering A such that is becomes more similar to clustering B. The clustering A remains the same, even though the labels are permuted.
    Arguments:
        a (list) cluster labels for the first clustering.
        b (list) cluster labels for the second clustering.
        sorted_labels (list of (list of int)) sorted cluster labels for the first clustering. If included as an argument, this will also be permuted.
    Returns:
        (list) permuted version of a, the first clustering.
        (list of (list of int)) permuted, sorted labels. Included only if sorted_labels is passed as an argument
    '''
    a = np.array(a)
    b = np.array(b)
    G = nx.DiGraph()
    start = 'start'
    end = 'end'
    G.add_node(start)
    G.add_node(end)
    for label_a in set(a):
        for label_b in set(a).union(set(a)): # We restrict the range of the permutation to not increase the number of labels
            node_a = 'start_%d' % label_a
            node_b = 'end_%d' % label_b
            G.add_node(node_a)
            G.add_node(node_b)
            G.add_edge(start, node_a, capacity=1)
            G.add_edge(node_b, end, capacity=1)
            capacity = np.sum(np.logical_and(a == label_a, b == label_b))
            G.add_edge(node_a, node_b, capacity=capacity)
    (flow_value, flow_dict) = nx.algorithms.flow.maximum_flow(G, start, end)
    permutation = {}
    for (node_a, node_a_dict) in flow_dict.items():
        if node_a in [start, end]:
            continue
        for (node_b, node_b_flow) in node_a_dict.items():
            if node_b in [start, end]:
                continue
            if node_b_flow > 0:
                assert node_b_flow == 1
                label_a = int(node_a.split('_')[-1])
                label_b = int(node_b.split('_')[-1])
                assert label_a not in permutation.keys()
                assert label_b not in permutation.values(), 'label_b = %d' % label_b
                permutation[label_a] = label_b
    # Some labels may not be included if A has fewer clusters than B
    # To handle these clusters, we arbitrarily assign them new clusters
    missing_labels = [label for label in set(a) if label not in permutation.keys()]
    free_labels = set(a) - set(permutation.values())
    for (label_a, label_b) in zip(missing_labels, free_labels):
        permutation[label_a] = label_b
    if sorted_labels is None:
        return [permutation[node] for node in a]
    else:
        inv_permutation = {value: key for (key, value) in permutation.items()}
        permuted_sorted_labels = [sorted_labels[inv_permutation[label]] for label in sorted(set(a))]
        return ([permutation[node] for node in a], permuted_sorted_labels)

if __name__ == '__main__':
    a = [0, 0, 0, 1, 1]
    b = [1, 1, 1, 2, 3]
    permute_clustering(a, b)
