package model;

public class GraphRequest {

    String dtype;
    String graph;

    public GraphRequest(String dtype, String graph) {
        this.dtype = dtype;
        this.graph = graph;
    }

    public String getDType() {
        return dtype;
    }

    public String getGraph() {
        return graph;
    }
}
