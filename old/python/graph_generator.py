import random
import re
import sys
import networkx as nx


# get the sign of a triangle
def triangle_sign(G, t):
    return G[t[0]][t[1]]['weight'] * G[t[0]][t[2]]['weight'] * G[t[1]][t[2]]['weight']


# get the ratio of unbalanced triangles
def ratio_unbalanced_trinagles(triangles):
    count = 0
    for t in triangles:
        if t[1] == -1:
            count += 1
    return count/len(triangles)


# get the balanced triangles
def get_balanced_triangles(triad_cliques):
    balanced_triangles = [t for t in triad_cliques if t[1] == 1]
    return balanced_triangles


if __name__ == '__main__':
    # parameters
    n = 10  # number of nodes
    density = 0.3  # density
    unbalanced_triangles = 1  # ratio of unbalanced triangles

    for i in xrange(10):
        # create a complete graph of n nodes
        G = nx.complete_graph(n)

        # divide the nodes into two clusters
        cluster_1_size = 15  # random.randint(1, n-1)

        cluster_1 = [node for node in range(0, cluster_1_size)]
        cluster_2 = [node for node in range(cluster_1_size, n)]

        # assign edges weights to make the graph balanced
        for e in G.edges().data():
            if (e[0] in cluster_1 and e[1] in cluster_1) or (e[0] in cluster_2 and e[1] in cluster_2):
                G[e[0]][e[1]]['weight'] = 1
            else:
                G[e[0]][e[1]]['weight'] = -1

        # remove edges randomly until the desired density is reached
        while nx.density(G) > density:
            edges = list(G.edges().data())

            ri = random.randint(0, len(edges)-1)
            e = edges[ri]

            G.remove_edge(e[0], e[1])

        # abort the graph generation if the graph is not connected
        if not nx.is_connected(G):
            print('The resulting graph is not connected: the generation is aborted.')
            sys.exit()

        # unbalance the graph
        cliques = [(clique, triangle_sign(G, clique)) for clique in nx.enumerate_all_cliques(G) if len(clique) == 3]
        current_unbalanced_triangles = 0

        while current_unbalanced_triangles < unbalanced_triangles:
            # get a random balanced triangle and a random edge
            balanced_triangles = get_balanced_triangles(cliques)
            ri = random.randint(0, len(balanced_triangles)-1)
            source = random.randint(0, 2)
            target = random.randint(0, 2)
            while source == target:
                target = random.randint(0, 2)

            triangle = balanced_triangles[ri][0]
            source = triangle[source]
            target = triangle[target]

            # invert the sign of the selected edge
            G[source][target]['weight'] *= -1

            # update the ratio of unbalanced triangles
            cliques = [(clique, triangle_sign(G, clique)) for clique, _ in cliques]
            current_unbalanced_triangles = ratio_unbalanced_trinagles(cliques)

        # write the graph to file
        file = open('../data/graph_' + str(n) + '_' + str(density) + '_' + str(unbalanced_triangles) + '_' + str(i) + '.txt', "w")
        for e in G.edges().data():
            file.write(str(e[0]) + ',' + str(e[1]) + ',' + str(e[2]['weight']) + '\n')
        file.close()
