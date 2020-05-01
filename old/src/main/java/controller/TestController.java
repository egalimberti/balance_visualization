package controller;

import model.SpectralAnalysis;
import model.Node;
import model.Edge;
import model.GraphRequest;
import com.google.gson.Gson;
import java.util.ArrayList;
import java.util.HashMap;

public class TestController {
    public static String generateResponse(String body) {
        StringBuilder sb = new StringBuilder("");
        GraphRequest gReq = new Gson().fromJson(body, GraphRequest.class);

        // type of decomposition
        String dtype = gReq.getDType();
        // graph stucture
        String graph = gReq.getGraph();

        // read nodes and edges
        HashMap<Integer, Node> nodesMap = new HashMap<>();
        ArrayList<Edge> edgesList = new ArrayList<>();

        String line;
        String cvsSplitBy = ",";

        String[] lines = graph.split("\n");
        int i;
        for (i = 0; i < lines.length; i++) {
            line = lines[i];
            String[] data = line.trim().split(cvsSplitBy);

            int sourceId = Integer.parseInt(data[0]);
            int targetId = Integer.parseInt(data[1]);
            int weight = Integer.parseInt(data[2]);

            String sign = (weight > 0) ? "+" : "-";

            // update the map with the nodes
            Node source;
            if (!nodesMap.containsKey(sourceId)) {
                source = new Node(sourceId);
                nodesMap.put(sourceId, source);
            } else {
                source = nodesMap.get(sourceId);
            }

            Node target;
            if (!nodesMap.containsKey(targetId)) {
                target = new Node(targetId);
                nodesMap.put(targetId, target);
            } else {
                target = nodesMap.get(targetId);
            }

            // add the edge to the list
            Edge edge = new Edge(i, source, target, sign);
            edgesList.add(edge);
        }

        // execute the spectral analysis
        Node[] nodes = nodesMap.values().toArray(new Node[nodesMap.size()]);
        Edge[] edges = edgesList.toArray(new Edge[edgesList.size()]);

        SpectralAnalysis spectralAnalysis = new SpectralAnalysis(nodes, edges);
        spectralAnalysis.eigenvectorDecomposition(1, 1);
        spectralAnalysis.dtypeCoefficient(dtype);

        // prepare the response in JSON format
        Node[] layoutNodes = spectralAnalysis.getNodes();
        ArrayList<Edge> layoutInterEdges = spectralAnalysis.getInterEdges();
        ArrayList<Edge> layoutIntraEdges = spectralAnalysis.getIntraEdges();
        double eigenvalue = spectralAnalysis.getEigenvalue();

        sb.append("{\"nodes\":[");
        i = 0;
        for (Node node : layoutNodes) {
            if (i != 0) {
                sb.append(",");
            }
            sb.append(node.toString());
            i++;
        }

        sb.append("],\"intraEdges\":[");
        i = 0;
        for (Edge edge : layoutIntraEdges) {
            if (i != 0) {
                sb.append(",");
            }

            if (edge.getSource().getCluster() == edge.getTarget().getCluster()) {
                sb.append(edge.toString());
                i++;
            }
        }

        sb.append("],\"interEdges\":[");
        i = 0;
        for (Edge el : layoutInterEdges) {
            if (i != 0) {
                sb.append(",");
            }

            if (el.getSource().getCluster() != el.getTarget().getCluster()) {
                sb.append(el.toString());
                i++;
            }
        }

        sb.append("],\"dType\":\"" + String.format("%.2f", spectralAnalysis.getDtypeCoefficient())
                + "\", \"eigenvalue\":\"" + String.format("%.2f", eigenvalue) + "\"}");

        return sb.toString();
    }

    public static void main(String[] args) {
        String body1 = "{\"dtype\":\"none\",\"graph\":\"0,1,1\n0,2,1\n1,3,1\n2,3,1\n4,5,1\n4,6,1\n5,7,1\n6,7,1\n1,4,-1\n1,6,-1\n2,6,-1\"}";
        String body2 = "{\"dtype\":\"none\",\"graph\":\"0,4,1\n0,9,-1\n1,5,-1\n1,7,-1\n1,8,-1\n2,3,1\n2,6,-1\n2,9,1\n3,4,1\n3,5,-1\n3,6,1\n3,8,-1\n4,5,1\n4,6,-1\n5,6,1\n6,9,1\n7,9,1\n8,9,1\n\"}";
        System.out.println(generateResponse(body1));
    }

}
