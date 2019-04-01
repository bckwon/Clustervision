import numpy as np 
from collections import defaultdict
from scipy.spatial.distance import cdist, pdist
import scipy.cluster.hierarchy as h




def find_centers(cluster_data):
	"""
	finds the centers of the clusters.

	Parameters
	----------
	cluster_data: A dict contaning cluster indices as keys and the members of the cluster as values.

	Returns
	-------
	An array containing centers of each of the clusters.
	"""
	cluster_centers = []
	for x in cluster_data:
 		cluster_x = np.array(cluster_data[x])
 		centroid_x = np.mean(cluster_x, axis=0).reshape(1,-1)
 		cluster_centers.append(centroid_x)
 	return cluster_centers





def davies_bouldin(data_matrix, clusters):
	"""
	Computes Davies-Bouldin statistic for the clusters. 

	Parameters
	----------
	data_matrix: An array of the data vectors.
	clusters: An array containing cluster indices.

	Returns
	-------
	The DB score of the clustering.
 	"""
 	num_clusters = len(set(clusters))
 	cluster_data = defaultdict(list)

 	# create a dict with indices as keys and the data vectors in the cluster as values.
 	for x,i in zip(data_matrix, clusters):
 		cluster_data[i].append(x)

 	cluster_centers = {i: x for i,x in enumerate(find_centers(cluster_data))}
 	david_bouldin_score = 0.0

 	for x in cluster_data:
 		db_x = []
 		# as a numpy array
 		cluster_x = np.array(cluster_data[x])
 		# compute centroid
 		centroid_x = cluster_centers[x]
 		# dist between each point in the cluster to the centroid.
 		dist_x = cdist(cluster_x, centroid_x)
 		# averge distance between each point and the centroid.
 		dist_x_mean = np.mean(dist_x)
 		for y in cluster_data:
 			cluster_y = np.array(cluster_data[y])
 			centroid_y = cluster_centers[y]
	 		dist_y = cdist(cluster_y, centroid_y)
	 		dist_y_mean = np.mean(dist_y)
 			if (x != y):
 				# add the mean distances for two clusters.
 				numerator_dist = dist_x_mean + dist_y_mean
 				# compute the distance between two centroids.
 				dist_xy = cdist(centroid_x, centroid_y)
 				# DB entry for x-y pair.
 				if dist_xy == 0:
 					dist_xy = 1e-12
 				db_xy = float(numerator_dist) / float(dist_xy)
 				# add x-y pair score to the x-list.
 				db_x.append(db_xy)
 		# The max distance from x-y pairs for all y is the contribution of x cluster.
 		david_bouldin_score += max(db_x)
 	# normalize by number of clusters.
 	return david_bouldin_score / num_clusters


def Wk(data_matrix, clusters):
	"""
	Computes the intra-cluster distances between points in a cluster.

	W_k = \sum_{i=1}^k frac{1}{2n_k} D_k
	where D_k = 2*n_k \sum_{x_i \in C_k}||x_i - \mu_k||^2

	Parameters
	----------
	data_matrix: An array of the data vectors.
	clusters: An array containing cluster indices.

	Returns
	-------
	The pooled intra-cluster distance.
	"""
	num_clusters = len(set(clusters))
 	cluster_data = defaultdict(list)

 	# create a dict with indices as keys and the data vectors in the cluster as values.
 	for x,i in zip(data_matrix, clusters):
 		cluster_data[i].append(x)

 	cluster_centers = find_centers(cluster_data)
 	K = len(cluster_centers)
 	return sum([np.linalg.norm(cluster_centers[i] - c)**2 / (2*len(c)) for i in range(K) for c in cluster_data[i]])




def boundaries(data_matrix):
	"""
	Finds the maximum and minimum of data vectors along each direction.

	Parameters
	----------
	data_matrix: An array of the data vectors.

	Returns
	-------
	Arrays containing minimum and maximum value of each column.
	"""
	return (np.min(data_matrix, axis=0), np.max(data_matrix, axis=0))



def gap_statistic(data_matrix, clusters, l=10, dist=1.0):
	"""
	Computes the Gap Statistic for the clustering.

	Parameters
	----------
	data_matrix: An array of the data vectors.
	clusters: An array containing cluster indices.
	l: Number of reference datasets to be created.
	dist: Distance value for the 

	Returns
	-------
	Value of the gap statistic.
	"""
	min_dim, max_dim = boundaries(data_matrix)
	Wk_real = np.log(Wk(data_matrix, clusters))
	# create l reference datasets
	for i in range(1,l):
		# initialize the Wk vector for l datasets.
		WKs = []
		data_ref = []
		for n in range(len(data_matrix)):
			ref_vec = [np.random.uniform(a,b) for (a,b) in zip(min_dim, max_dim)]
			data_ref.append(ref_vec)
		data_ref = np.array(data_ref)
		Z = h.linkage(data_ref)
		clusters_ref = h.fcluster(Z, t=dist, criterion='distance')
		# print Wk(data_ref, clusters_ref)
		Wk_ref = np.log(Wk(data_ref, clusters_ref))
		WKs.append(Wk_ref)
	WK_av = np.mean(WKs)
	sk = np.sqrt(np.sum((Wk_real - WK_av)**2)/l)
	return WK_av, sk





# data_matrix = [[1,2],[2,4],[1,1], [3,4],[2,3]]
# # print np.array(data_matrix).shape
# # print boudaries(np.array(data_matrix))
# clusters = [1,0,1,2,2]
# # print Wk(data_matrix, clusters)

# print davies_bouldin(data_matrix, clusters)
# print "gap_statistic..."
# print gap_statistic(data_matrix, clusters)




















