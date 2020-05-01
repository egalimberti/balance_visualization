package model;

import java.util.ArrayList;
import org.apache.commons.math3.linear.EigenDecomposition;
import java.util.HashMap;
import org.apache.commons.math3.linear.MatrixUtils;
import org.apache.commons.math3.linear.RealMatrix;
import org.apache.commons.math3.linear.RealVector;

public class SpectralAnalysis {

    public static final String DTYPE_NONE = "none";
    public static final String DTYPE_SIZE = "cluster size";

    private final Node[] nodes;
    private final Edge[] edges;

    // laplacian matrix
    private double[][] L;

    // minimum eigenvalue of the laplacian matrix
    private Double eigenvalue;

    // angular coefficient of the x axis
    private Double dtypeCoefficient;

    public SpectralAnalysis(Node[] nodes, Edge[] edges) {
        this.nodes = nodes;
        this.edges = edges;

        buildLaplacianMatrix();

        this.eigenvalue = -1d;
        this.dtypeCoefficient = 0d;
    }

    private void buildLaplacianMatrix() {
        L = new double[nodes.length][nodes.length];

        for (Edge e : edges) {
            int s = e.getSourceId();
            int t = e.getTargetId();

            L[s][t] = -e.getWeight();
            L[t][s] = -e.getWeight();

            L[s][s] = L[s][s] + 1;
            L[t][t] = L[t][t] + 1;
        }
    }

    // assign the position to the nodes
    public void eigenvectorDecomposition(float xScaleFactor, float yScaleFactor) {
        HashMap<Float, Integer> distinctEv = new HashMap<>();
        ArrayList<Float> clusters = new ArrayList<>();

        double[] eigenvector = getEigenvector();
        for (int i = 0; i < eigenvector.length; i++) {
            float me = (float) eigenvector[i];

            if (distinctEv.containsKey(me)) {
                distinctEv.put(me, distinctEv.get(me) + 1);
            } else {
                distinctEv.put(me, 1);
                clusters.add(me);
            }
        }

        for (Node n : nodes) {
            float me = (float) eigenvector[n.getId()];
            int h = distinctEv.get(me);
            int cluster = clusters.indexOf(me);
            float x = me * xScaleFactor;
            float y = h * yScaleFactor;
            distinctEv.put(me, h - 1);

            n.setX(x);
            n.setY(y);
            n.setOriginalX(me);
            n.setOriginalY(h);
            n.setCluster(cluster);
        }
    }

    public void dtypeCoefficient(String dtype) {

        // scale based on the number of nodes in the clusters
        if (dtype.equals(DTYPE_SIZE)) {
            Integer numberOfNodes = nodes.length;
            Double numberOfLeftNodes = 0d;
            Double numberOfRightNodes = 0d;

            for (Node n : nodes) {
                if (n.getX() < 0) {
                    numberOfLeftNodes += 1;
                } else {
                    numberOfRightNodes += 1;
                }
            }

            numberOfLeftNodes /= numberOfNodes;
            numberOfRightNodes /= numberOfNodes;

            dtypeCoefficient = numberOfLeftNodes - numberOfRightNodes;
        }
    }

    private double[] getEigenvector() {
        // compute the SVD decompositions of the laplacian

        RealMatrix matrix = MatrixUtils.createRealMatrix(L);
        EigenDecomposition eigenDecomposition = new EigenDecomposition(matrix);
        RealMatrix D = eigenDecomposition.getD();

        // get the eigenvalues in an arraylist
        ArrayList<Double> eigenvalues = new ArrayList<>();
        for (int i = 0; i < D.getRowDimension(); i++) {
            double[] row = D.getRow(i);
            eigenvalues.add(row[i]);
        }

        // get the index of the minimum eigenvalue
        int index = getMinOrMaxValueIndex(eigenvalues, false);

        // get the minimum eigenvalue
        eigenvalue = eigenvalues.get(index);

        // get the minimum eigenvector
        double[] eigenvector = eigenDecomposition.getEigenvector(index).toArray();

        // get the element of the eigenvector of highest absolute value
        double maxAbsValue = getMaxAbsValue(eigenvector);
        if (maxAbsValue == 0) {
            maxAbsValue = 1;
        }

        // normalize the eigenvector of interest
        for (int i = 0; i < eigenvector.length; i++) {
            eigenvector[i] = eigenvector[i] / maxAbsValue;
        }

        return eigenvector;
    }

    private int getMinOrMaxValueIndex(ArrayList<Double> values, boolean getMax) {
        int index = 0;
        double value = values.get(0);

        for (int i = 1; i < values.size(); i++) {
            if (getMax) {
                if (values.get(i) > value) {
                    index = i;
                    value = values.get(i);
                }
            } else {
                if (values.get(i) < value) {
                    index = i;
                    value = values.get(i);
                }
            }
        }

        return index;
    }

    private double getMaxAbsValue(double[] eigenvector) {
        double max = Math.abs(eigenvector[0]);

        for (int i = 1; i < eigenvector.length; i++) {
            double abs = Math.abs(eigenvector[i]);
            if (abs > max) {
                max = abs;
            }
        }

        return max;
    }

    public ArrayList<Edge> getIntraEdges() {
        ArrayList<Edge> intraEdges = new ArrayList<>();

        for (Edge e : edges) {
            if (e.getSource().getCluster() == e.getTarget().getCluster()) {
                intraEdges.add(e);
            }
        }

        return intraEdges;
    }

    public ArrayList<Edge> getInterEdges() {
        ArrayList<Edge> interEdges = new ArrayList<>();

        for (Edge e : edges) {
            if (e.getSource().getCluster() != e.getTarget().getCluster()) {
                interEdges.add(e);
            }
        }

        return interEdges;
    }

    public Node[] getNodes() {
        return nodes;
    }

    public Edge[] getEdges() {
        return edges;
    }

    public Double getEigenvalue() {
        return eigenvalue;
    }

    public Double getDtypeCoefficient() {
        return dtypeCoefficient;
    }

}
