#!/bin/python
import numpy as np
import networkx as nx

def permute_clustering(a, b):
    '''Permutes the labels in clustering A such that is becomes more similar to clustering B'''
    a = np.array(a)
    b = np.array(b)
    G = nx.Graph()
    start = 'start'
    end = 'end'
    G.add_node(start)
    G.add_node(end)
    for label_a in set(a):
        for label_b in set(b):
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
                assert label_b not in permutation.values()
                permutation[label_a] = label_b
    return [permutation[node] for node in a]

if __name__ == '__main__':
    a = [0, 0, 0, 1, 1]
    b = [1, 1, 1, 2, 3]
    permute_clustering(a, b)
