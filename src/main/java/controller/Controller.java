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

@WebServlet(name = "Controller", urlPatterns = {"/Controller"})

public class Controller extends HttpServlet {

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("text/html;charset=UTF-8");
        try (PrintWriter out = response.getWriter()) {
            // read the body of the request
            String body = request.getReader().lines().reduce("", (accumulator, actual) -> accumulator + actual);
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

                String sign;
                if (weight > 0) {
                    sign = "+";
                } else {
                    sign = "-";
                }

                // apdate the map with the nodes
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
            Node[] nodes = nodesMap.values().toArray(new Node[0]);
            Edge[] edges = edgesList.toArray(new Edge[0]);

            SpectralAnalysis spectralAnalysis = new SpectralAnalysis(nodes, edges);
            spectralAnalysis.eigenvectorDecomposition(1, 1);
            spectralAnalysis.dtypeCoefficient(dtype);

            // prepare the response in JSON format
            Node[] layoutNodes = spectralAnalysis.getNodes();
            ArrayList<Edge> layoutInterEdges = spectralAnalysis.getInterEdges();
            ArrayList<Edge> layoutIntraEdges = spectralAnalysis.getIntraEdges();
            double eigenvalue = spectralAnalysis.getEigenvalue();

            out.write("{\"nodes\":[");
            i = 0;
            for (Node node : layoutNodes) {
                if (i != 0) {
                    out.write(",");
                }
                out.write(node.toString());
                i++;
            }

            out.write("],\"intraEdges\":[");
            i = 0;
            for (Edge edge : layoutIntraEdges) {
                if (i != 0) {
                    out.write(",");
                }

                if (edge.getSource().getCluster() == edge.getTarget().getCluster()) {
                    out.write(edge.toString());
                    i++;
                }
            }

            out.write("],\"interEdges\":[");
            i = 0;
            for (Edge el : layoutInterEdges) {
                if (i != 0) {
                    out.write(",");
                }

                if (el.getSource().getCluster() != el.getTarget().getCluster()) {
                    out.write(el.toString());
                    i++;
                }
            }

            out.write("],\"dType\":\"" + spectralAnalysis.getDtypeCoefficient() + "\", \"eigenvalue\":\"" + String.format("%.2f", eigenvalue) + "\"}");
            out.flush();
            out.close();
        } catch (Exception ex) {}
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
