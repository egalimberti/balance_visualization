package controller;

import model.SpectralAnalysis;
import model.Node;
import model.Edge;
import model.GraphRequest;
import com.google.gson.Gson;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.HashMap;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet(name = "Controller", urlPatterns = { "/Controller" })

public class Controller extends HttpServlet {

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("text/html;charset=UTF-8");
        try (PrintWriter out = response.getWriter()) {
            // read the body of the request
            String body = request.getReader().lines().reduce("", (accumulator, actual) -> accumulator + actual);
            out.write(generateResponse(body));
            out.flush();
            out.close();
        } catch (Exception ex) {
        }
    }

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

        sb.append("],\"dTypeCoefficient\":" + spectralAnalysis.getDtypeCoefficient() + ", \"eigenValue\":" + eigenvalue
                + "}");

        return sb.toString();
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

}
