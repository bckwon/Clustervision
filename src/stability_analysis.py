import pandas as pd 
import numpy as np 
from sklearn.cluster import KMeans, SpectralClustering, DBSCAN
from sklearn.decomposition import NMF
import sys
from scipy.spatial.distance import cosine
# from scipy.stats import entropy
import math


__author__ = "jverma"



###############################################################################
##############################################################################


class Stability:
	"""
	"""
	def __init__(self, clustering_results, cluster_centers):
		"""
		"""
		self.clustering_results = clustering_results
		self.cluster_centers = cluster_centers
		print("stability...")




	def compute_count_sim_matrix(self):
		"""
		"""
		count_vecs = self.clustering_results.transpose()
		sim_matrix = np.zeros((count_vecs.shape[0], count_vecs.shape[0]))
		for i in range(count_vecs.shape[0]):
			for j in range(count_vecs.shape[0]):
				sim_matrix[i][j] = np.sum(count_vecs[i] == count_vecs[j])
		return sim_matrix




	def compute_prob_sim_matrix(self, max_index=10, metric='cosine'):
		"""
		"""
		count_vecs = self.clustering_results.transpose()
		
		prob_vectors = []
		for x in count_vecs:
			vec_dict = {i: 0.0 for i in range(max_index)}
			for j in x:
				vec_dict[j] += 1.0
			vec_values = np.array(([vec_dict[i] for i in range(max_index)])) / len(vec_dict)
			prob_vectors.append(vec_values)
		prob_vectors = np.array(prob_vectors)


		sim_matrix = np.zeros((count_vecs.shape[0], count_vecs.shape[0]))
		for k in range(prob_vectors.shape[0]):
			for l in range(prob_vectors.shape[0]):
				if (metric == 'cosine'):
					sim_matrix[k][l] = 1.0 - cosine(prob_vectors[k], prob_vectors[l])
				elif (metric == 'kl'):
					sim_matrix[k][l] = modified_KL(prob_vectors[k], prob_vectors[l])
				else:
					print('Choose cosine or kl as metric.')
					sys.exit()
		return sim_matrix




	def compute_centeroid_sim_matrix(self):
		"""
		"""
		return None





	def consensus_clustering(self, sim='prob', metric='kl', method='spectral', meta_clusters=10):
		"""
		"""
		if (sim == 'count'):
			sim_matrix = self.compute_count_sim_matrix()
		elif (sim == 'prob'):
			sim_matrix = self.compute_prob_sim_matrix(max_index=10, metric=metric)
		elif (sim == 'centeroid'):
			sim_matrix = self.compute_centeroid_sim_matrix()
		else:
			print('Only available metrics are: count, prob, centeroid')
			sys.exit()
		if (method == 'spectral'):
			labels = SpectralClustering(n_clusters=meta_clusters, affinity='precomputed').fit_predict(sim_matrix)
			return labels
		if (method == 'nnmf'):
			model = NMF(n_components=meta_clusters, init='random', random_state=0)
			nmf = model.fit(sim_matrix)
			labels = []
			for x in nmf.components_.T:
				idx = np.argsort(x)[meta_clusters-1]
				labels.append(idx)
			return labels


###########################################################################################
############################################################################################
def modified_KL(p,q):
	"""
	"""
	p_new = p[p > 0.0]
	q_new = q[q > 0.0]
	diff_idx = [i for i in range(len(p)) if q[i]==0.0 or p[i] ==0.0]


	epsilon = min(np.min(p_new), np.min(q_new)) * 0.001
	gamma = 1.0 - len(diff_idx) * epsilon

	kl_div = 0.0
	for i in range(len(p)):
		if (p[i] != 0.0):
			if (q[i] == 0.0):
				score = epsilon
			else:
				score = gamma * q[i]
			div_score = (p[i] - score) * math.log(p[i]/score)
			kl_div += div_score
	return kl_div






###########################################################################################
###########################################################################################

def compute_clusters(data, n_runs=10, method='KMeans', n_clusters=10):
	"""
	"""
	result_labels = np.arange(data.shape[0])
	result_centers = []
	if (method == 'KMeans'):
		for i in range(n_runs):
			clust = KMeans(n_clusters=n_clusters).fit(data)
			result_labels = np.vstack((result_labels, clust.labels_))
			result_centers.append(clust.cluster_centers_)
	return result_labels[1:], result_centers



input_data = pd.read_csv('../data/sutter_data/sutter3-15-2017-all.csv')
input_data = input_data.as_matrix()

clusters, centers = compute_clusters(input_data)


#################################
out = Stability(clusters, centers)

print(len(out.consensus_clustering()))




















