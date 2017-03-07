from sklearn.datasets import fetch_20newsgroups
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np 

from sklearn.cluster import KMeans
from sklearn import manifold



# load the 20 newsgroup data
dataset = fetch_20newsgroups()

# labels 
labels = dataset.target
true_k = np.unique(labels).shape[0] # true number of clusters.

# compute vector representation of the text.
vectorizer = TfidfVectorizer(max_df=0.5)
X = vectorizer.fit_transform(dataset.data)


# k-means clustering
km = KMeans(n_clusters=true_k, init='k-means++', max_iter=100, n_init=1)


# tsne dimensional reduction.
tsne = manifold.TSNE(n_components=2, init='pca', random_state=0)
Y = tsne.fit_transform(X)


