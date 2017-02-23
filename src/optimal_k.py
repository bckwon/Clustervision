import numpy as np 
import scipy.cluster.hierarchy as h



__author__ "jverma"



def find_K(data):
	"""
	Computes the best k-values from the cuts of hierarchical clustering.

	Parameters
	----------
	data: A numpy arrat containing the data.

	Returns
	--------
	A list containing potential k-values to try.
	"""
	# compute linkage matrix
	Z = h.linkage(data)

	# extract unique distance values
	distances = set()
	for x in Z[:-1]:
		dist = x[2]
		distances.add(dist)


	# potential k-values
	k_choices = []
	for d in distances:
		labels = h.fcluster(Z, t=d, criterion='distance')
		k = len(set(labels))
		k_choices.append(k)


	return k_choices


