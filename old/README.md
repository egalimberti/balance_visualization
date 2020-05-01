# balance_visualization
Visualization of Balance in Signed Networks


Per aprire il progetto in NetBeans, cliccare su Open Project selezionare la directory.
Il progetto è organizzato come segue:
-Web Pages -> directory contente la parte di front end
	- style: contiene i fogli di stile
	- scripts: contiene lo script javascript graphDrawing.js che si occupa del disegno vero e proprio
	- assets e dist: sono cartelle contenenti il codice, ecc per la realizzazione la dashboard come prevista da Bootstrap
	- index.html: la home page che ospita la dashboard di disegno
	
-Source Packages -> contiene il codice Java di back end, in particolare nelle cartelle
	- .beans: sono contenute le classi utili a descrivere la struttura del grafo e l'analisi spettrale (quest'ultima da rivedere
		per i problemi di Out of Memory già discussi)
	- .servlets: contiene il Controller (il main vero e proprio) che si occupa di ricevere la richiesta dalla pagina, ad eseguire
		la decomposizione matriciale e a restituire l'output in formato Json


Per eseguire è sufficiente avere GlassFish installato su Netbeans, selezionare nel menù in alto il browser da utilizzare per eseguire il sito
e premere il tasto play.
