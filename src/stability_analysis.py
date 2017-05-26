import pandas as pd 
import numpy as np 
from sklearn.cluster import KMeans, SpectralClustering, DBSCAN
from sklearn.decomposition import NMF
import sys
from scipy.spatial.distance import cosine
# from scipy.stats import entropy
import math


import quality_metrics
import cluster


__author__ = "jverma"



###############################################################################
##############################################################################


class Stability:
	"""
	Studies stability in different clustering runs via consensus clustering.
	"""
	def __init__(self, clustering_results, data, cluster_centers):
		"""
		Instantiates the class.

		Parameters
		----------
		clustering_results: A numpy array where each row containts the cluster indices from a clustering run.
		cluster_centers: A list of lists where each inner list contains the centeroids of a clustering run.
		"""
		self.clustering_results = clustering_results
		self.cluster_centers = cluster_centers
		self.data = data
		self.array_data = data.as_matrix()
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




	def compute_prob_sim_matrix(self, max_index=20, metric='kl'):
		"""
		"""
		count_vecs = self.clustering_results.transpose()
		
		prob_vectors = []
		for x in count_vecs:
			vec_dict = {i: 0.0 for i in range(max_index)}
			print(vec_dict)
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
		centeroid_vecs = []
		for x in self.data:
			vec = []
			for center_grp in self.cluster_centers:
				for center in center_grp:
					sim_to_center = cosine(x, center)
					vec.append(sim_to_center)
			centeroid_vecs.append(np.array(vec))
		centeroid_vecs = np.array(centeroid_vecs)


		sim_matrix = np.zeros((centeroid_vecs.shape[0], centeroid_vecs.shape[0]))
		for k in range(centeroid_vecs.shape[0]):
			for l in range(centeroid_vecs.shape[0]):
				sim_matrix[k][l] = 1.0 - cosine(centeroid_vecs[k], centeroid_vecs[l])
		return sim_matrix






	def consensus_clustering(self, sim='count', metric='kl', method='spectral', meta_clusters=10):
		"""
		"""
		params = {'sim': sim, 'metric': metric, 'alg_name': method, 'n_clusters': meta_clusters}
		if (sim == 'count'):
			sim_matrix = self.compute_count_sim_matrix()
		elif (sim == 'prob'):
			sim_matrix = self.compute_prob_sim_matrix(max_index=20, metric=metric)
		elif (sim == 'centeroid'):
			sim_matrix = self.compute_centeroid_sim_matrix(self.data)
		else:
			print('Only available metrics are: count, prob, centeroid')
			sys.exit()
		if (method == 'spectral'):
			labels = SpectralClustering(n_clusters=meta_clusters, affinity='precomputed').fit_predict(sim_matrix)
			# return labels
		if (method == 'nnmf'):
			model = NMF(n_components=meta_clusters, init='random', random_state=0)
			nmf = model.fit(sim_matrix)
			labels = []
			for x in nmf.components_.T:
				idx = np.argsort(x)[meta_clusters-1]
				labels.append(idx)
				# labels = np.array(labels)
			# return labels

		clustering_results = cluster.build_clustering_object(self.data, labels, params, clustering_key=None)

		# sorted_labels = cluster.sort_labels(self.array_data, labels)
		# feature_selected_labels = cluster.feature_selection_labels(self.data, labels)


		# quality_silhouette = quality_metrics.silhouette_score(self.array_data, labels)
		# quality_silhouette_clusters = quality_metrics.silhouette_clusters(self.array_data, labels)
		# quality_silhouette_samples = quality_metrics.silhouette_samples(self.array_data, labels)

		# quality_calinski_harabaz = quality_metrics.calinski_harabaz_score(self.array_data, labels)

		# quality_neg_davies_bouldin = quality_metrics.neg_davies_bouldin(self.array_data, labels)

		# quality_neg_gap_statistic = quality_metrics.neg_gap_statistic(self.array_data, labels)

		# quality_neg_cohesion = quality_metrics.neg_cohesion(self.array_data, labels)
		# quality_neg_cohesion_clusters = quality_metrics.neg_cohesion_clusters(self.array_data, labels)

		# quality_separation = quality_metrics.separation_score(self.array_data, labels)
		# quality_separation_clusters = quality_metrics.separation_clusters(self.array_data, labels)

		# quality_min_max_dist = quality_metrics.min_max_dist(self.array_data, labels)

		# quality_sdbw = quality_metrics.neg_s_Dbw(self.array_data, labels)


		# clustering_results = {'quality': quality_sdbw, 'quality_metrics': {
		# 					'sdbw': quality_sdbw,
		# 					'silhouette_score': quality_silhouette,
		# 					'silhouette_clusters': quality_silhouette_clusters,
		# 					'silhouette_samples': quality_silhouette_samples,
		# 					'calinski_harabaz': quality_calinski_harabaz,
		# 					'davies_bouldin': quality_neg_davies_bouldin,
		# 					'gap_statistic': quality_neg_gap_statistic,
		# 					'cohesion': quality_neg_cohesion,
		# 					'cohesion_clusters': quality_neg_cohesion_clusters,
		# 					'separation': quality_separation,
		# 					'separation_clusters': quality_separation_clusters,
		# 					'min_max_dist': quality_min_max_dist,
		# 					},
		# 					'labels': labels.tolist(),
		# 					'n_clusters': meta_clusters,
		# 					'clustering_parameters': params,
		# 					'sorted_labels': sorted_labels,
		# 					'cluster_feature_selection': feature_selected_labels
		# 					}
		return clustering_results


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



# input_data = pd.read_csv('../data/sutter_data/sutter3-15-2017-all.csv')
# input_data = input_data.as_matrix()

# clusters, centers = compute_clusters(input_data)


#################################
# out = Stability(clusters, centers)
# consensus_results = out.consensus_clustering(sim='centeroid', metric='cosine', data=input_data)
# np.savetxt('centroid_consensus.csv', consensus_results, delimiter=',')
# # print(out.compute_centeroid_sim_matrix(input_data))
# print(len(out.consensus_clustering(data=input_data)))




















