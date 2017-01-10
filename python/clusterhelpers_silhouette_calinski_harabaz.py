import scipy.cluster.hierarchy as hcluster
import numpy
import pickle
from sklearn.feature_extraction.text import CountVectorizer
from sklearn import metrics
import time
import matplotlib.pyplot as plt


def RunCluster(output):
	sups = map(lambda e: e['sup'], output)
	labels = ClusterAnalysis(sups)['labels']
	for index, item in enumerate(labels):
		output[index]['clindex']=str(item)
	return output
		# output[index]["clindex"] = cl_index[index]

def ClusterAnalysis(output, dist=0.01):
	output = list(map(lambda e: ' '.join(e), output))
	patient_id_list = output
	vectorizer = CountVectorizer()
	pattern_vectors = vectorizer.fit_transform(patient_id_list)
	pattern_vectors = pattern_vectors.toarray()

	patient_dist_matrix = numpy.array(DistPatientSup(pattern_vectors))

	linkage_mat = hcluster.linkage(patient_dist_matrix)

	labels = hcluster.fcluster(linkage_mat, t=dist, criterion='distance')

	start = time.clock()
	silhouette_coeff = metrics.silhouette_score(pattern_vectors, labels, metric='euclidean')
	sample_silhouette_values = metrics.silhouette_samples(pattern_vectors, labels)

	print ("Silhouette: ", time.clock() - start)

	calinski_harabaz_coeff = metrics.calinski_harabaz_score(pattern_vectors, labels)

	print ("Calinski: ", time.clock() - start)

	clustering_results = {'distance': dist, 'labels': labels.tolist(), 'silhouette_coeff': silhouette_coeff.item(), 'calinski_harabaz_coeff': calinski_harabaz_coeff.item(), 'sample_silhouette_values': sample_silhouette_values.tolist()}

	return clustering_results

def add_node(node, parent ):
	# First create the new node and append it to its parent's children
	newNode = dict(node_id=node.id, children=[] )
	parent["children"].append( newNode )
	# Recursively add the current node's children
	if node.left: add_node( node.left, newNode )
	if node.right: add_node( node.right, newNode )

# Label each node with the names of each leaf in its subtree
def label_tree( n ):
	# If the node is a leaf, then we have its name
	if len(n["children"]) == 0:
		leafNames = [ id2name[n["node_id"]] ]
	# If not, flatten all the leaves in the node's subtree
	else:
		leafNames = reduce(lambda ls, c: ls + label_tree(c), n["children"], [])
	# Delete the node id since we don't need it anymore and
	# it makes for cleaner JSON
	del n["node_id"]
	# Labeling convention: "-"-separated leaf names
	n["name"] = name = "-".join(sorted(map(str, leafNames)))

	return leafNames



def ClusterAnalysisAll(output):
	output = list(map(lambda e: ' '.join(e), output))
	patient_id_list = output
	vectorizer = CountVectorizer()
	pattern_vectors = vectorizer.fit_transform(patient_id_list)
	pattern_vectors = pattern_vectors.toarray()

	patient_dist_matrix = numpy.array(DistPatientSup(pattern_vectors))

	linkage_mat = hcluster.linkage(patient_dist_matrix)
	distances_set = set(linkage_mat[:-1,2])

	clustering_results = []
	for dist in distances_set:
		labels = hcluster.fcluster(linkage_mat, t=dist, criterion='distance')
		silhouette_coeff = metrics.silhouette_score(pattern_vectors, labels, metric='euclidean')
		sample_silhouette_values = metrics.silhouette_samples(pattern_vectors, labels)
		calinski_harabaz_coeff = metrics.calinski_harabaz_score(pattern_vectors, labels)
		clust_results = {'distance': dist, 'labels': labels.tolist(), 'silhouette_coeff': silhouette_coeff, 'calinski_harabaz_coeff': calinski_harabaz_coeff, 'sample_silhouette_values': sample_silhouette_values.tolist()}
		clustering_results.append(clust_results)

	return clustering_results


def ClusterAnalysisAllProduceDendrogram(output):

	pickle.dump(output, open( "cluster_dump.pickle", "wb" ))

	patient_id_list = list(map(lambda e: ' '.join(e), output))
	vectorizer = CountVectorizer()
	pattern_vectors = vectorizer.fit_transform(patient_id_list)
	pattern_vectors = pattern_vectors.toarray()

	patient_dist_matrix = numpy.array(DistPatientSup(pattern_vectors))

	linkage_mat = hcluster.linkage(patient_dist_matrix)

	# Dendrogram
	# T = hcluster.to_tree(linkage_mat, rd = False)
	# d3Dendro = dict(children=[], name="Root1")
	# add_node( T, d3Dendro )
	# label_tree( d3Dendro["children"][0] )

	distances_set = set(linkage_mat[:-1,2])

	clustering_results = []
	sscores = []
	cuts = []
	num_cluster = []
	for counter, dist in enumerate(distances_set):
		labels = hcluster.fcluster(linkage_mat, t=dist, criterion='distance')
		silhouette_coeff = metrics.silhouette_score(pattern_vectors, labels, metric='euclidean')
		sample_silhouette_values = metrics.silhouette_samples(pattern_vectors, labels)
		calinski_harabaz_coeff = metrics.calinski_harabaz_score(pattern_vectors, labels)
		clust_results = {'distance': dist, 'labels': labels.tolist(), 'silhouette_coeff': silhouette_coeff, 'calinski_harabaz_coeff': calinski_harabaz_coeff, 'sample_silhouette_values': sample_silhouette_values.tolist()}
		if counter == 0:
			sscores.append(round(silhouette_coeff, 2))
			cuts.append(dist)
			num_cluster.append(len(numpy.unique(labels).tolist()))
		elif round(silhouette_coeff,2) >= sscores[-1] +.01:
			sscores.append(round(silhouette_coeff, 2))
			cuts.append(dist)
			num_cluster.append(len(numpy.unique(labels).tolist()))
		clustering_results.append(clust_results)

	# Dendrogram on Python
	# hcluster.dendrogram(linkage_mat, labels=patient_id_list, orientation='right')
	hcluster.dendrogram(linkage_mat)
	# Mark the cuts in the tree that signify two or three clusters
	ax = plt.gca()
	bounds = ax.get_xbound()
	for cut_index, cut in enumerate(cuts):
		ax.plot(bounds, [float(cut), float(cut)], '--', c='k')
		# ax.plot(bounds, [4, 4], '--', c='k')
		ax.text(bounds[1], float(cut), str(sscores[cut_index]) + ', ' + str(num_cluster[cut_index]), va='center', fontdict={'size': 12})
	# ax.text(bounds[1], 4, ' three clusters', va='center', fontdict={'size': 15})
	plt.xlabel("Sample index")
	plt.ylabel("Cluster distance")
	plt.savefig("scipy-dendrogram.png")



	# plt.show()

	return clustering_results


def DistPatientSup(pattern_vectors, metric='euclidean'):
	dist_matrix = metrics.pairwise.pairwise_distances(pattern_vectors, metric=metric)
	return dist_matrix




def DistPatientSup_BC(sup_id_list):
	output_list = []
	for index1, item1 in enumerate(sup_id_list):
		row = []
		for index2, item2 in enumerate(sup_id_list):
			if index1==index2:
				row.append(0)
			else:
				common_elem_len = len(list(set(item1).intersection(item2)))
				avg_len = ((1.0 - float(common_elem_len)/len(item1)) + (1.0 - float(common_elem_len)/len(item2)))/2.0
				row.append(avg_len)
		output_list.append(row)
	return output_list
