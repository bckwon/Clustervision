import numpy as np 

def count_cluster_membership(cl_choices):
	cluster_label_list = [x["labels"] for x in cl_choices]
	num = len(cluster_label_list[0])
	cluster_membership_count = [[0 for j in range(num)] for i in range(num)]
	for clustering_index, cluster_label in enumerate(cluster_label_list):
		for datapoint_index, datapoint_value in enumerate(cluster_label):
			for dpi in range(num):
				if cluster_label[int(dpi)] is datapoint_value:
					cluster_membership_count[datapoint_index][dpi] = cluster_membership_count[datapoint_index][dpi] + 1
	return cluster_membership_count