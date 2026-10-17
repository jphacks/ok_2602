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

// パケット全体の構造体
type PacketJson struct {
	Hex      string       `json:"hex"`
	Ethernet EthernetJson `json:"ethernet"`
	Arp      *ArpJson     `json:"arp,omitempty"`
	Ipv4     *Ipv4Json    `json:"ipv4,omitempty"`
	Icmp     *IcmpJson    `json:"icmp,omitempty"`
	Payload  string       `json:"payload"`
}
