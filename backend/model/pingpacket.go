package model

// Ethernet ヘッダ
type EthernetJson struct {
	Dst  string `json:"dst"`
	Src  string `json:"src"`
	Type uint16 `json:"type"`
}

// ARP パケット
type ArpJson struct {
	Htype uint16 `json:"htype"`
	Ptype uint16 `json:"ptype"`
	Hlen  uint8  `json:"hlen"`
	Plen  uint8  `json:"plen"`
	Op    uint16 `json:"op"`
	Sha   string `json:"sha"`
	Spa   string `json:"spa"`
	Tha   string `json:"tha"`
	Tpa   string `json:"tpa"`
}

// IPv4 ヘッダ
type Ipv4Json struct {
	VerIHL      uint8  `json:"ver_ihl"`
	ToS         uint8  `json:"tos"`
	TotalLength uint16 `json:"total_length"`
	ID          uint16 `json:"id"`
	Flags       uint16  `json:"flags"`
	TTL         uint8  `json:"ttl"`
	Protocol    uint8  `json:"protocol"`
	Checksum    uint16 `json:"checksum"`
	Src         string `json:"src"`
	Dst         string `json:"dst"`
}

// ICMP ヘッダ
type IcmpJson struct {
	Type     uint8  `json:"type"`
	Code     uint8  `json:"code"`
	Checksum uint16 `json:"checksum"`
	ID       uint16 `json:"id"`
	Seq      uint16 `json:"seq"`
}

// UDP ヘッダ
type UdpJson struct {
	SrcPort  uint16 `json:"src_port"`
	DstPort  uint16 `json:"dst_port"`
	Length   uint16 `json:"length"`
	Checksum uint16 `json:"checksum"`
}

// RIPv2 の経路エントリ
type RipEntryJson struct {
	Afi      uint16 `json:"afi"`
	RouteTag uint16 `json:"route_tag"`
	Address  string `json:"address"`
	Mask     string `json:"mask"`
	NextHop  string `json:"next_hop"`
	Metric   uint32 `json:"metric"`
}

// RIPv2 メッセージ
type RipJson struct {
	Command uint8          `json:"command"`
	Version uint8          `json:"version"`
	Entries []RipEntryJson `json:"entries"`
}

// パケット全体の構造体
type PacketJson struct {
	Hex      string       `json:"hex"`
	Ethernet EthernetJson `json:"ethernet"`
	Arp      *ArpJson     `json:"arp,omitempty"`
	Ipv4     *Ipv4Json    `json:"ipv4,omitempty"`
	Icmp     *IcmpJson    `json:"icmp,omitempty"`
	Udp      *UdpJson     `json:"udp,omitempty"`
	Rip      *RipJson     `json:"rip,omitempty"`
	Payload  string       `json:"payload"`
}
