def parse_constraint(constraint_str):
    '''Parses the constrain string passed in the clustering request.
    This string is either
        * None, indicating that no constrain was specified, OR
        * a string of comma-separated integers.
    This function outputs a list of integers. In the case where no
    user constring was provided, the output is an empty list.'''
    if constraint_str is None:
        return []
    else:
        return eval(constraint_str)

def satisfies_constraints(clustering, same_cluster, diff_cluster):
    '''Checks whether a clustering object satisfies constraints

    clustering - Dict. A clustering object.
    same_cluster - List of list of integers. Each sublist represents a constraint that
                   these points choice belong in the same cluster.
    diff_cluster - List of list of integers. Each sublist represents a constraint that
                   these points choice belong in the different clusters.

    Returns:

    satisfied - Boolean flag indicating whether the clustering satisfied the specified
                constriants.
    '''
    for indices in same_cluster:
        label_set = set()
        for index in indices:
            label = clustering['labels'][index]
            label_set.add(label)
        if len(label_set) > 1:
            return False

    for indices in diff_cluster:
        label_set = set()
        for index in indices:
            label = clustering['labels'][index]
            label_set.add(label)
        if len(label_set) < len(indices):
            return False
    return True
