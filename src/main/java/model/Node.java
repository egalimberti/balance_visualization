package model;

public class Node {

    private int id;
    private float x;
    private float y;
    private float originalX;
    private float originalY;
    private int cluster;

    public Node(int id) {
        this.id = id;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public float getX() {
        return x;
    }

    public void setX(float x) {
        this.x = x;
    }

    public float getY() {
        return y;
    }

    public void setY(float y) {
        this.y = y;
    }

    public float getOriginalX() {
        return originalX;
    }

    public void setOriginalX(float originalX) {
        this.originalX = originalX;
    }

    public float getOriginalY() {
        return originalY;
    }

    public void setOriginalY(float originalY) {
        this.originalY = originalY;
    }

    public int getCluster() {
        return cluster;
    }

    public void setCluster(int cluster) {
        this.cluster = cluster;
    }

    // returns the JSON format of the edge
    @Override
    public String toString() {
        return "{\"id\": \"" + id + "\", \"x\":" + x + ", \"y\":" + y + ", \"cluster\": \"" + cluster + "\"}";
    }

    @Override
    public Node clone() {
        Node clone = new Node(id);
        clone.setX(x);
        clone.setY(y);
        clone.setOriginalX(originalX);
        clone.setOriginalY(originalY);
        clone.setCluster(cluster);
        
        return clone;
    }
}
