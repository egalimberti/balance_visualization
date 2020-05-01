package model;

public class Edge {

    private int id;
    private Node source;
    private Node target;
    private String sign;

    public Edge(int id, Node source, Node target, String sign) {
        this.id = id;
        this.source = source;
        this.target = target;
        this.sign = sign;
    }

    public Node getSource() {
        return source;
    }

    public void setSource(Node source) {
        this.source = source;
    }

    public int getSourceId() {
        return source.getId();
    }

    public Node getTarget() {
        return target;
    }

    public void setTarget(Node target) {
        this.target = target;
    }

    public int getTargetId() {
        return target.getId();
    }

    public String getSign() {
        return sign;
    }

    public void setSign(String sign) {
        this.sign = sign;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public float getWeight() {
        if (sign.equals("+")) {
            return 1f;
        } else if (sign.equals("-")) {
            return -1f;
        } else {
            return 0f;
        }
    }

    // returns the JSON format of the edge
    @Override
    public String toString() {
        int source_id = source.getId();
        int target_id = target.getId();
        boolean consecutive = false;

        if ((source.getX() > target.getX()) || ((source.getX() == target.getX()) && (source.getY() < target.getY()))) {
            source_id = target.getId();
            target_id = source.getId();
        }

        if ((source.getCluster() == target.getCluster())
                && Math.abs(source.getOriginalY() - target.getOriginalY()) == 1) {
            consecutive = true;
        }

        return "{\"id\": " + id + ",\"source\": " + source_id + ", \"target\": " + target_id + ", \"sign\":\"" + sign
                + "\", \"consecutive\":" + consecutive + "}";
    }
}
