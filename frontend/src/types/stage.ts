// バックエンド (Go) の model パッケージの構造体と対応する型定義

export interface Port {
  id: string;
  mac: string;
  ip: string;
}

export interface Node {
  id: string;
  type: 'router' | 'pc' | 'switch';
  ports: Port[];
}

// Goの PortEndpoint に対応
export interface PortEndpoint {
  node_id: string; // Goの json:"node_id" に合わせる
  port_id: string; // Goの json:"port_id" に合わせる
}

export interface Edge {
  id: string;
  source: PortEndpoint;
  target: PortEndpoint;
}

// Goの Topology に対応
export interface Topology {
  nodes: Node[];
  edges: Edge[];
}

export interface Stage {
  id: string;
  title: string;
  description: string;
  topology: Topology;
}
