#import "@preview/fletcher:0.5.8" as fletcher: diagram, edge, node

#set page(height: auto, width: auto, margin: 5mm, fill: none)
#set text(font: "Noto Sans", fill: white)

#let tint(c) = (stroke: c, fill: rgb(..c.components().slice(0, 3), 5%), inset: 8pt)

#diagram(
  node-corner-radius: 4pt,
  edge-stroke: white,

  node((0.5, -2), ..tint(green), name: <wan>, [Internet (WAN)]),

  node((1.5, -1), [Router/Home Server]),

  node((0.5, 0), ..tint(red), name: <br-wan>, `br-wan`),
  edge(<br-wan>, <wan>, "-"),
  node((2.5, 0), ..tint(blue), [Music Assistant]),

  node((0, 1), ..tint(red), name: <vlan-private>, `vlan-private`),
  node((1, 1), ..tint(red), name: <vlan-iot-cloud>, `vlan-iot-cloud`),
  node((2, 1), ..tint(red), name: <vlan-guest>, `vlan-guest`),
  node((3, 1), ..tint(red), name: <vlan-iot-local>, `vlan-iot-local`),

  edge(<vlan-private>, <br-wan>, label-pos: 20%, "-", [NAT]),
  edge(<vlan-iot-cloud>, <br-wan>, label-pos: 20%, "-", [NAT]),
  edge(<vlan-guest>, <br-wan>, label-pos: 20%, "-", [NAT]),

  node(enclose: ((-2, -1), (5, 2)), ..tint(teal), name: <big>),

  node((1, 3), ..tint(yellow), name:<ghm>, [Google Home Mini]),
  edge(<ghm>, <vlan-iot-cloud>, label: [Wi-Fi], label-pos: 20%, "wave")
)


