"""
Python implementation of S-Dbw statistic for evaluating the quality of a clustering.
"""
import numpy as np 
from collections import defaultdict
from scipy.spatial.distance import cdist, pdist


__author__ = "jverma"




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



def density_limit(data_matrix, cluster_data):
	"""
	Computes the limit for the density. This will a threshold cap quantifying clustering.

	Parameters
	----------
	data_matrix: An array of the data vectors.
	cluster_data: A dict contaning cluster indices as keys and the members of the cluster as values.

	Returns
	-------
	The numerical value for the Scatter and the density limit. 
	"""
	# feature variance of the original data.
	feature_var = np.var(data_matrix, axis=1)
	normed_data_var = np.linalg.norm(feature_var)


 	# feature variances of the clusters.
	cluster_feature_var = []
	for i in cluster_data:
		cluster_i = np.array(cluster_data[i])
		variance_vec = np.var(cluster_i, axis=1)
		normed_variance = np.linalg.norm(variance_vec)
		cluster_feature_var.append(normed_variance)


	S = np.mean(cluster_feature_var) / normed_data_var

	sigma = (1.0/len(cluster_feature_var)) * (np.sqrt(np.mean(cluster_feature_var)))

	return S, sigma





def point_density(data_matrix, cluster_data, i,j, x, sigma):
	"""
	Computes the density of a point relative to two clusters.

	Parameters
	----------
	data_matrix: An array of the data vectors.
	cluster_data: A dict contaning cluster indices as keys and the members of the cluster as values.
	i: cluster one index
	j: cluster two index
	x: The point unders consideration.
	sigma: The density threshold.

	Returns
	-------
	The numerical value for the point density.
	"""
	# compute the union of two clusters.
	cluster_union = cluster_data[i] + cluster_data[j]
	cluster_union = np.array(cluster_union)
	x = x.reshape(1,-1)

	# count the number of points with distance less than sigma.
	dist_arr = cdist(cluster_union, x)
	# print "sigma", sigma
	# print dist_arr
	return np.sum(dist_arr < sigma)



def Density_bw(data_matrix, cluster_data, sigma):
	"""
	Computes Density_bw statistic.

	Parameters
	----------
	data_matrix: An array of the data vectors.
	cluster_data: A dict contaning cluster indices as keys and the members of the cluster as values.
	sigma: The density threshold.

	Returns
	-------
	The numerical value of the Density_bw statistic.
	"""
	# cluster centeroids
	cluster_centers = {i: x for i,x in enumerate(find_centers(cluster_data))}
	k = len(cluster_centers)

	G = 2.0 / (k*(k-1))
	for i in cluster_centers:
		centroid_i = cluster_centers[i]
		# print "centeroid i", centroid_i
		for j in cluster_centers:
			if (j < i):
				centroid_j = cluster_centers[j]
				# print "centeroid j", centroid_j
				midpt = (centroid_i + centroid_j) / 2.0
				# print "midpt", midpt

				density_i = point_density(data_matrix, cluster_data, i, j, centroid_i, sigma)
				density_j = point_density(data_matrix, cluster_data, i, j, centroid_j, sigma)
				density_ij = point_density(data_matrix, cluster_data, i, j, midpt, sigma)
				# print density_i, density_j, density_ij
				R_ij = density_ij / (max(density_i, density_j))

				G += R_ij
	return G




def SDbw(data_matrix, clusters):
	"""
	Computes SD_bw statistic for the clustering.

	Parameters
	----------
	data_matrix: An array of the data vectors.
	clusters: An array containing cluster indices.

	Returns
	-------
	The SD_bw score of the clustering.
	"""
	# create a dict with indices as keys and the data vectors in the cluster as values.
	cluster_data = defaultdict(list)
 	for x,i in zip(data_matrix, clusters):
 		cluster_data[i].append(x)


 	# compute S and density limit.
	S, sigma = density_limit(data_matrix, cluster_data)
	G = Density_bw(data_matrix, cluster_data, sigma)

	return S + G









	

# data_matrix = [[1,2],[2,4],[1,1], [3,4],[2,3]]
# clusters = [1,0,1,2,2]
# print SDbw(data_matrix, clusters)











