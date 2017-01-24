import numpy as np
import sklearn.cluster
import copy

class ClusteringAlgorithm(object):
    def __init__(self, data, model_name, params=None):
        self.data = data
        self.model_name = model_name
        self.round = 0
        self.params = self.parameters_from_name(model_name)
        self.model = self.get_model(self.model_name, self.params)

    def get_model(self, model_name, params):
        if model_name == 'KMeans':
            return sklearn.cluster.KMeans(n_clusters=params['n_clusters'].value)
        elif model_name == 'SpectralClustering':
            return sklearn.cluster.SpectralClustering(n_clusters=params['n_clusters'].value)
        elif model_name == 'dbscan':
            return sklearn.cluster.DBSCAN()
        else:
            assert False, 'Unknown clustering algorithn name'

    def parameters_from_name(self, model_name):
        if model_name == 'kmeans' or model_name == 'spectral':
            params = {
                'n_clusters': IntegerParameter('n_clusters', 2, 20),
            }
        elif model_name == 'dbscan':
            params = {}
        return params


    def get_candidate_params(self):
        candidate_params = [self.params]
        for param_name in self.params:
            up_option = {
                param_name: self.params[param_name].move_up()
            }
            down_option = {
                param_name: self.params[param_name].move_down()
            }
            for other_param_name in self.params:
                if param_name != other_param_name:
                    up_option[other_param_name] = other_param
                    down_option[other_param_name] = other_param

            candidate_params.append(up_option)
            candidate_params.append(down_option)
        return candidate_params

    def get_candidate_clusterings(self, candidate_param_vec):
        clustering_vec = []
        for candidate_params in candidate_param_vec:
            model = self.get_model(self.model_name, candidate_params):
            clustering = model.fit_predict(X)
            clustering_vec.append(clustering)
        return clustering_vec


class Parameter(object):
    def look_up(self):
        raise NotImplementedError

    def look_down(self):
        raise NotImplementedError

    def move_up(self):
        param = copy.deepcopy(self)
        param.value = self.look_up()
        return param

    def move_down(self):
        param = copy.deepcopy(self)
        param.value = self.look_down()
        return param

class IntegerParameter(Parameter):
    def __init__(self, name, min_value=0, max_value=10):
        self.name = name
        self.min_value = min_value
        self.max_value = max_value
        self.round = 0
        self.value = int(0.5 * (min_value + max_value))
    
    def look_up(self):
        proposal = self.value + int((self.max_value - self.min_value) / 2**(self.round + 2))
        proposal = min(self.max_value, proposal)
        return proposal

    def look_down(self):
        proposal = self.value - int((self.max_value - self.min_value) / 2**(self.round + 2))
        proposal = max(self.min_value, proposal)
        return proposal

        
class ContinuousParameter(Parameter):
    def __init__(self, name, min_value=0, max_value=1):
        self.name = name
        self.min_value = min_value
        self.max_value = max_value
        self.round = 0
        self.value = 0.5 * (min_value + max_value)
    
    def look_up(self):
        proposal = self.value + (self.max_value - self.min_value) / 5.0
        proposal = min(self.max_value, proposal)
        return proposal

    def look_down(self):
        proposal = self.value + (self.max_value - self.min_value) / 5.0
        proposal = max(self.min_value, proposal)
        return proposal

if __name__ == '__main__':
    param1 = ContinuousParameter('k')
    param2 = param1.move_up()
    param3 = param2.move_up()
    param4 = param3.move_up()
    print param1.value, param2.value, param3.value, param4.value

