#!/usr/bin/env python
# coding: utf-8

# In[2]:


import random
import re
import networkx as nx


# # Funzioni

# triangleSign: restituisce il segno di un triangolo

# In[3]:


def triangleSign(x, G):
    return G[x[0]][x[1]]['weight']*G[x[0]][x[2]]['weight']*G[x[1]][x[2]]['weight']


# count_utriangles: restituisce il rapporto di triangoli sbilanciati sul totale

# In[4]:


def count_utriangles(triadi):
    c=0
    for t in triadi:
        if t[1]==-1:
            c=c+1
    return float(c)/len(triadi)


# get_balanced_triangles: ritorna i triangoli bilanciati

# In[5]:


def get_balanced_triangles(triad_cliques):
    pos_cliques = [x for x in triad_cliques if x[1]==1]
    return pos_cliques


# In[32]:


# parameters
nn = 30
tr_den = 0.3

# # Generazione Grafi BILANCIATI

# Crea un grafo completo con nn nodi
# nn: numero di nodi del grafo da creare

# In[33]:

for num in range(20):

    G = nx.complete_graph(nn)


    # suddivide il grafo in due fazioni con un numero casuale di nodi

    # In[34]:


    num_nodes = 15  # random.randint(5,nn-5)
    group1 = []
    for i in range(1,num_nodes):
        ri = random.randint(0,nn-1)
        if ri not in group1:
            group1.append(ri)

    group2 = []
    for i in range(0,nn):
        if i not in group1:
            group2.append(i)

    # Assegno agli archi il segno corretto sulla base della suddivisione in gruppi

    # In[36]:


    edges = list(G.edges().data())

    for e in edges:
        if (e[0] in group1 and e[1] in group1) or (e[0] in group2 and e[1] in group2):
            G[e[0]][e[1]]['weight'] = 1
        else:
            G[e[0]][e[1]]['weight'] = -1


    # Rimuovi archi casuali fino a ottenere la threshold di densità (tr) desiderata

    # In[37]:


    while nx.density(G) > tr_den:
        edges = list(G.edges().data())
        ri = random.randint(0,len(edges)-1)
        e = edges[ri]
        G.remove_edge(e[0],e[1])


    # Verifico che il grafo risultante sia connesso

    # In[38]:


    if not nx.is_connected(G):
        continue


    # Verifico che tutti i triangoli siano bilanciati

    # In[39]:


    all_cliques = nx.enumerate_all_cliques(G)
    triad_cliques = [[x,triangleSign(x,G)] for x in all_cliques if len(x)==3 ]
    u_triangle = count_utriangles(triad_cliques)


    # Salvo il grafo su un apposito file csv

    # In[40]:


    nomefile = "../data/prog_sequence/" + str(num) + "_graph_0.txt"
    file = open(nomefile,"w") 
    #i=0
    for e in G.edges().data():
        #i=i+1
        #if e[2]['weight'] == 1:
            #sign = "+"
        #else:
            #sign = "-"
        file.write(str(e[0]) + "," + str(e[1]) + "," + str(e[2]['weight']) + "\n")
    file.close() 

    # # Sbilanciamento del Grafo

    # Dopo aver creato un grafo bilanciato è possibile sbilanciarlo seguendo le operazioni sottostanti

    # portando il numero di triangoli sbilanciati ad essere almeno pari alla threshold tr (porzione di triangoli sbilanciati desiderata sul totale)

    # In[41]:

    for tr in [0.2, 0.4, 0.6, 0.8, 1]:
        
        edges = list(G.edges().data())
        all_cliques = nx.enumerate_all_cliques(G)
        triad_cliques = [[x,triangleSign(x,G)] for x in all_cliques if len(x)==3 ]
        u_triangle = count_utriangles(triad_cliques)

        # In[44]:


        while u_triangle<tr:  

            try:
                b_tr = get_balanced_triangles(triad_cliques)
                ri = random.randint(0,len(b_tr)-1) 
            except ValueError:
                break
            source_i = random.randint(0,2)
            while True:
                target_i = random.randint(0,2)
                if target_i != source_i:
                    break

            triangolo = b_tr[ri][0]
            source = triangolo[source_i]
            target = triangolo[target_i]
            G[source][target]['weight'] =  G[source][target]['weight']*-1
            all_cliques = nx.enumerate_all_cliques(G)
            triad_cliques = [[x,triangleSign(x,G)] for x in all_cliques if len(x)==3 ]
            u_triangle = count_utriangles(triad_cliques)

        # Salvo il grafo su un apposito file csv

        # In[46]:
        
        nomefile = "../data/prog_sequence/" + str(num) + "_graph_" + str(tr) + ".txt"
        file = open(nomefile,"w") 
        #i=0
        for e in G.edges().data():
            #i=i+1
            #if e[2]['weight'] == 1:
                #sign = "+"
            #else:
                #sign = "-"
            file.write(str(e[0]) + "," + str(e[1]) + "," + str(e[2]['weight']) + "\n")
        file.close()
