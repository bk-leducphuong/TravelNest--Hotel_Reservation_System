#!/usr/bin/env python3
"""Generate all TravelNest report diagrams as .drawio XML files."""

import os
from xml.sax.saxutils import escape

OUTDIR = os.path.dirname(os.path.abspath(__file__))

# ── draw.io color palette ──
C = {
    "blue_fill": "#dae8fc",       "blue_stroke": "#6c8ebf",
    "green_fill": "#d5e8d4",     "green_stroke": "#82b366",
    "yellow_fill": "#fff2cc",    "yellow_stroke": "#d6b656",
    "orange_fill": "#ffe6cc",    "orange_stroke": "#d79b00",
    "red_fill": "#f8cecc",       "red_stroke": "#b85450",
    "purple_fill": "#e1d5e7",    "purple_stroke": "#9673a6",
    "grey_fill": "#f5f5f5",      "grey_stroke": "#666666",
    "white_fill": "#ffffff",     "white_stroke": "#000000",
}

def _header():
    return '''<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="drawio" version="26.0.0">
  <diagram name="Page-1">
    <mxGraphModel dx="1200" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1200" pageHeight="900">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>'''

def _footer():
    return '''      </root>
    </mxGraphModel>
  </diagram>
</mxfile>'''

def _rect(uid, x, y, w, h, label, fill="#dae8fc", stroke="#6c8ebf", rounded=1, fontsize=12, bold=False, parent="1"):
    fs = f"fontStyle={'1' if bold else '0'};fontSize={fontsize};"
    return f'<mxCell id="{uid}" value="{escape(label)}" style="rounded={rounded};whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};{fs}" vertex="1" parent="{parent}"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'

def _edge(uid, src, tgt, label="", style="", parent="1", waypoints=None):
    base = f'<mxCell id="{uid}" value="{escape(label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;{style}" edge="1" parent="{parent}" source="{src}" target="{tgt}">'
    geo = '<mxGeometry relative="1" as="geometry" />'
    if waypoints:
        pts = "".join(f'<mxPoint x="{p[0]}" y="{p[1]}"/>' for p in waypoints)
        geo = f'<mxGeometry relative="1" as="geometry"><Array as="points">{pts}</Array></mxGeometry>'
    return base + geo + "</mxCell>"

def _swimlane(uid, x, y, w, h, label, fill="#dae8fc", stroke="#6c8ebf", parent="1"):
    return f'<mxCell id="{uid}" value="{escape(label)}" style="swimlane;startSize=30;fillColor={fill};strokeColor={stroke};whiteSpace=wrap;html=1;" vertex="1" parent="{parent}"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'

def _cyl(uid, x, y, w, h, label, fill="#d5e8d4", stroke="#82b366", parent="1"):
    return f'<mxCell id="{uid}" value="{escape(label)}" style="shape=cylinder3;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};fontSize=11;" vertex="1" parent="{parent}"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'

def _ellipse(uid, x, y, w, h, label, fill="#ffffff", stroke="#000000",parent="1"):
    return f'<mxCell id="{uid}" value="{escape(label)}" style="ellipse;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};fontSize=10;" vertex="1" parent="{parent}"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'

def _diamond(uid, x, y, w, h, label, parent="1"):
    return f'<mxCell id="{uid}" value="{escape(label)}" style="rhombus;whiteSpace=wrap;html=1;fillColor={C["yellow_fill"]};strokeColor={C["yellow_stroke"]};fontSize=10;" vertex="1" parent="{parent}"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'

def _ua_actor(uid, x, y, label, parent="1"):
    return f'<mxCell id="{uid}" value="{escape(label)}" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor={C["white_fill"]};strokeColor={C["white_stroke"]};" vertex="1" parent="{parent}"><mxGeometry x="{x}" y="{y}" width="30" height="60" as="geometry"/></mxCell>'

def _ua_ellipse(uid, x, y, w, h, label, parent="1"):
    return f'<mxCell id="{uid}" value="{escape(label)}" style="ellipse;whiteSpace=wrap;html=1;fillColor={C["white_fill"]};strokeColor={C["white_stroke"]};fontSize=12;" vertex="1" parent="{parent}"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'

def _ua_edge(uid, src, tgt, label="", style="", parent="1"):
    base = f'<mxCell id="{uid}" value="{escape(label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;{style}" edge="1" parent="{parent}" source="{src}" target="{tgt}">'
    return base + '<mxGeometry relative="1" as="geometry"/></mxCell>'

def write_file(name, content):
    path = os.path.join(OUTDIR, name)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  Created {name}")


# ═════════════════════════════════════════════════════════════════════════════
# HÌNH 2.1 - BIỂU ĐỒ USE CASE TỔNG QUÁT
# ═════════════════════════════════════════════════════════════════════════════
def fig_2_1_use_case_overview():
    parts = [_header()]
    nid = 2
    # Actors
    parts.append(_ua_actor(nid, 60, 260, "Khách\n(Guest)")); A_G = nid; nid+=1
    parts.append(_ua_actor(nid, 60, 480, "Người dùng\nđã xác thực")); A_AU = nid; nid+=1
    parts.append(_ua_actor(nid, 940, 260, "Chủ khách sạn\n(Hotel Admin)")); A_HA = nid; nid+=1
    parts.append(_ua_actor(nid, 940, 480, "Quản trị\nhệ thống")); A_SA = nid; nid+=1

    # System boundary
    parts.append(f'<mxCell id="{nid}" value="Hệ thống TravelNest" style="swimlane;startSize=30;fillColor={C["blue_fill"]};strokeColor={C["blue_stroke"]};whiteSpace=wrap;html=1;fontStyle=1;fontSize=14;" vertex="1" parent="1"><mxGeometry x="180" y="80" width="680" height="680" as="geometry"/></mxCell>')
    SYS = nid; nid += 1

    # Use cases inside system
    ucs = [
        ("Tìm kiếm khách sạn", 1), ("Xem chi tiết khách sạn", 1),
        ("Đặt phòng", 1), ("Thanh toán", 1),
        ("Quản lý đơn đặt", 1), ("Viết đánh giá", 1),
        ("Quản lý khách sạn", 2), ("Quản lý phòng", 2),
        ("Quản lý đơn đặt (Admin)", 2), ("Phản hồi đánh giá", 2),
        ("Xem báo cáo doanh thu", 2), ("Quản lý người dùng", 3),
        ("Phân quyền", 3),
    ]
    uc_ids = {}
    for i, (name, col) in enumerate(ucs):
        _y = 120 + (i % 7) * 80
        _x = 240 if col == 1 else (450 if col == 2 else 660)
        if col == 1: _x = 240 + (i//7)*200 if i<7 else 300
        # Simpler: grid of 4 cols, 4 rows
        row = i // 4
        _col = i % 4
        _x = 220 + _col * 155
        _y_pos = 130 + row * 120
        parts.append(_ua_ellipse(nid, _x, _y_pos, 140, 55, name, SYS))
        uc_ids[name] = nid; nid += 1

    # Edges
    edge_style = "exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
    parts.append(_ua_edge(nid, A_G, uc_ids["Tìm kiếm khách sạn"], "", edge_style)); nid+=1
    parts.append(_ua_edge(nid, A_G, uc_ids["Xem chi tiết khách sạn"], "", "exitX=0.5;exitY=1;exitDx=0;exitDy=0;")); nid+=1
    parts.append(_ua_edge(nid, A_AU, uc_ids["Đặt phòng"], "", edge_style)); nid+=1
    parts.append(_ua_edge(nid, A_AU, uc_ids["Thanh toán"], "", edge_style)); nid+=1
    parts.append(_ua_edge(nid, A_AU, uc_ids["Quản lý đơn đặt"], "", "exitX=0.5;exitY=0;exitDx=0;exitDy=0;")); nid+=1
    parts.append(_ua_edge(nid, A_AU, uc_ids["Viết đánh giá"], "", edge_style)); nid+=1
    # Include edges
    parts.append(_ua_edge(nid, uc_ids["Đặt phòng"], uc_ids["Thanh toán"], "<<include>>", "dashed=1;")); nid+=1
    parts.append(_ua_edge(nid, uc_ids["Đặt phòng"], uc_ids["Quản lý đơn đặt"], "<<extend>>", "dashed=1;")); nid+=1

    # Admin edges
    ein = "exitX=0;exitY=0.5;exitDx=0;exitDy=0;"
    parts.append(_ua_edge(nid, A_HA, uc_ids["Quản lý khách sạn"], "", ein)); nid+=1
    parts.append(_ua_edge(nid, A_HA, uc_ids["Quản lý phòng"], "", ein)); nid+=1
    parts.append(_ua_edge(nid, A_HA, uc_ids["Xem báo cáo doanh thu"], "", ein)); nid+=1
    parts.append(_ua_edge(nid, A_HA, uc_ids["Phản hồi đánh giá"], "", ein)); nid+=1
    parts.append(_ua_edge(nid, A_SA, uc_ids["Quản lý người dùng"], "", ein)); nid+=1
    parts.append(_ua_edge(nid, A_SA, uc_ids["Phân quyền"], "", ein)); nid+=1

    parts.append(_footer())
    write_file("fig_2_1_use_case_overview.drawio", "".join(parts))


# ═════════════════════════════════════════════════════════════════════════════
# HÌNH 2.2 - USE CASE PHÂN RÃ ĐẶT PHÒNG
# ═════════════════════════════════════════════════════════════════════════════
def fig_2_2_use_case_booking():
    parts = [_header()]
    nid = 2
    parts.append(_ua_actor(nid, 60, 300, "Người dùng\nđã xác thực")); A = nid; nid+=1

    # System boundary
    parts.append(f'<mxCell id="{nid}" value="Hệ thống - Đặt phòng" style="swimlane;startSize=30;fillColor={C["blue_fill"]};strokeColor={C["blue_stroke"]};whiteSpace=wrap;html=1;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="180" y="80" width="550" height="550" as="geometry"/></mxCell>')
    S = nid; nid+=1

    ucs = [
        ("Chọn phòng", 0), ("Kiểm tra tình\ntrạng phòng", 1),
        ("Giữ chỗ\ntạm thời (Hold)", 2), ("Thanh toán\nqua Stripe", 3), ("Xác nhận\nđặt phòng", 4),
    ]
    uc_ids = {}
    for i, (name, col) in enumerate(ucs):
        _x = 220 + col * 105
        parts.append(_ua_ellipse(nid, _x, 130 + (i//5)*200, 95, 55, name, S))
        uc_ids[name] = nid; nid += 1

    e = "exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
    parts.append(_ua_edge(nid, A, uc_ids["Chọn phòng"], "", e)); nid+=1
    parts.append(_ua_edge(nid, uc_ids["Chọn phòng"], uc_ids["Kiểm tra tình\ntrạng phòng"], "")); nid+=1
    parts.append(_ua_edge(nid, uc_ids["Giữ chỗ\ntạm thời (Hold)"], uc_ids["Kiểm tra tình\ntrạng phòng"], "<<include>>", "dashed=1;")); nid+=1
    parts.append(_ua_edge(nid, uc_ids["Giữ chỗ\ntạm thời (Hold)"], uc_ids["Thanh toán\nqua Stripe"], "")); nid+=1
    parts.append(_ua_edge(nid, uc_ids["Thanh toán\nqua Stripe"], uc_ids["Xác nhận\nđặt phòng"], "")); nid+=1
    # Stripe actor
    parts.append(_ua_actor(nid, 500, 500, "Stripe\n(Hệ thống ngoài)")); STR = nid; nid+=1
    parts.append(_ua_edge(nid, STR, uc_ids["Thanh toán\nqua Stripe"], "", "exitX=0;exitY=0.5;")); nid+=1

    parts.append(_footer())
    write_file("fig_2_2_use_case_booking.drawio", "".join(parts))


# ═════════════════════════════════════════════════════════════════════════════
# HÌNH 2.3 - USE CASE PHÂN RÃ QUẢN LÝ KHÁCH SẠN
# ═════════════════════════════════════════════════════════════════════════════
def fig_2_3_use_case_hotel_mgmt():
    parts = [_header()]
    nid = 2
    parts.append(_ua_actor(nid, 60, 300, "Chủ khách sạn\n(Hotel Admin)")); A = nid; nid+=1
    parts.append(f'<mxCell id="{nid}" value="Hệ thống - Quản lý khách sạn" style="swimlane;startSize=30;fillColor={C["blue_fill"]};strokeColor={C["blue_stroke"]};whiteSpace=wrap;html=1;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="180" y="80" width="650" height="500" as="geometry"/></mxCell>')
    S = nid; nid+=1

    ucs = [
        ("Thêm khách sạn mới", 0), ("Cập nhật thông tin\nkhách sạn", 1),
        ("Quản lý phòng", 2), ("Quản lý giá &\ntình trạng phòng", 3),
        ("Quản lý chính sách\nhủy phòng", 0), ("Quản lý ảnh\nkhách sạn", 1),
        ("Quản lý tiện nghi", 2),
    ]
    uc_ids={}
    for i,(name,col) in enumerate(ucs):
        _x = 210 + (i%4) * 155
        _y = 120 + (i//4) * 150
        parts.append(_ua_ellipse(nid, _x, _y, 135, 50, name, S))
        uc_ids[name] = nid; nid+=1

    parts.append(_ua_edge(nid, A, uc_ids["Thêm khách sạn mới"], "", "exitX=1;exitY=0.5;")); nid+=1
    for u in ucs[1:]:
        parts.append(_ua_edge(nid, A, uc_ids[u[0]], "", "exitX=0.5;exitY=0;")); nid+=1
    parts.append(_footer())
    write_file("fig_2_3_use_case_hotel_mgmt.drawio", "".join(parts))


# ═════════════════════════════════════════════════════════════════════════════
# HÌNH 2.4 - BIỂU ĐỒ HOẠT ĐỘNG ĐẶT PHÒNG & THANH TOÁN
# ═════════════════════════════════════════════════════════════════════════════
def fig_2_4_activity_booking():
    parts = [_header()]
    nid = 2

    # Swimlanes: User, System, Stripe
    parts.append(_swimlane(nid, 40, 40, 200, 750, "Người dùng", C["blue_fill"], C["blue_stroke"])); U=nid; nid+=1
    parts.append(_swimlane(nid, 250, 40, 280, 750, "Hệ thống TravelNest", C["orange_fill"], C["orange_stroke"])); S=nid; nid+=1
    parts.append(_swimlane(nid, 540, 40, 180, 750, "Stripe", C["grey_fill"], C["grey_stroke"])); STR=nid; nid+=1

    def _act(uid, x, y, w, h, label, parent):
        return _rect(uid, x, y, w, h, label, C["white_fill"], C["white_stroke"], rounded=0, fontsize=11, parent=parent)

    steps = [
        ("Nhập điểm đến,\nngày, số khách", U, 20, 60),
        ("Nhấn Tìm kiếm", U, 20, 150),
        ("Chọn khách sạn &\nphòng", U, 20, 250),
        ("Nhấn Đặt phòng", U, 20, 360),
        ("Xem tóm tắt &\nnhấn Thanh toán", U, 20, 460),
        ("Nhập thông tin thẻ", U, 20, 560),
        ("Xác nhận\nthanh toán", U, 20, 650),

        ("Truy vấn Elasticsearch\n+ kiểm tra phòng trống", S, 20, 100),
        ("Tạo Hold\n(giữ chỗ 15 phút)", S, 20, 220),
        ("Chuyển đến\nthanh toán Stripe", S, 20, 330),
        ("Nhận webhook\nthanh toán", S, 20, 450),
        ("Chuyển Hold\nthành Booking", S, 20, 540),
        ("Gửi email\nxác nhận", S, 20, 640),
        ("Cập nhật\nRoomInventory", S, 140, 640),

        ("Xử lý\nthanh toán", STR, 20, 460),
        ("Gửi webhook\nxác nhận", STR, 20, 560),
    ]

    step_ids = {}
    for label, parent, x, y in steps:
        parts.append(_act(nid, x, y, 150, 50, label, parent))
        step_ids[label] = nid; nid += 1

    # Decision node
    parts.append(_diamond(nid, 40, 250, 120, 60, "Còn phòng?")); D1 = nid; nid+=1
    parts.append(_diamond(nid, 40, 480, 120, 60, "Thanh toán\nthành công?")); D2 = nid; nid+=1

    # Edges (simplified for activity flow)
    eids = [step_ids[s] for s in ["Nhập điểm đến,\nngày, số khách", "Nhấn Tìm kiếm", "Truy vấn Elasticsearch\n+ kiểm tra phòng trống"]]
    # Just sequential connections in each lane
    user_steps = ["Nhập điểm đến,\nngày, số khách", "Nhấn Tìm kiếm", "Chọn khách sạn &\nphòng", "Nhấn Đặt phòng", "Xem tóm tắt &\nnhấn Thanh toán", "Nhập thông tin thẻ", "Xác nhận\nthanh toán"]
    for i in range(len(user_steps)-1):
        parts.append(_edge(nid, step_ids[user_steps[i]], step_ids[user_steps[i+1]], "")); nid+=1

    sys_steps = ["Truy vấn Elasticsearch\n+ kiểm tra phòng trống", "Tạo Hold\n(giữ chỗ 15 phút)", "Chuyển đến\nthanh toán Stripe", "Nhận webhook\nthanh toán", "Chuyển Hold\nthành Booking", "Gửi email\nxác nhận"]
    for i in range(len(sys_steps)-1):
        parts.append(_edge(nid, step_ids[sys_steps[i]], step_ids[sys_steps[i+1]], "")); nid+=1

    parts.append(_edge(nid, step_ids["Chuyển Hold\nthành Booking"], step_ids["Cập nhật\nRoomInventory"], "")); nid+=1

    stripe_steps = ["Xử lý\nthanh toán", "Gửi webhook\nxác nhận"]
    for i in range(len(stripe_steps)-1):
        parts.append(_edge(nid, step_ids[stripe_steps[i]], step_ids[stripe_steps[i+1]], "")); nid+=1

    # Cross-lane edges
    # Search -> System
    parts.append(_edge(nid, step_ids["Nhấn Tìm kiếm"], step_ids["Truy vấn Elasticsearch\n+ kiểm tra phòng trống"], "", "exitX=1;exitY=0.5;entryX=0;entryY=0.5;")); nid+=1
    # Decision: có phòng?
    parts.append(_edge(nid, step_ids["Tạo Hold\n(giữ chỗ 15 phút)"], D1, "Có", "entryX=1;entryY=0.5;")); nid+=1
    parts.append(_edge(nid, D1, step_ids["Chọn khách sạn &\nphòng"], "Không", "exitX=0;exitY=0.5;")); nid+=1
    parts.append(_edge(nid, D2, step_ids["Chuyển Hold\nthành Booking"], "Có", "exitX=1;exitY=0.5;")); nid+=1

    parts.append(_footer())
    write_file("fig_2_4_activity_booking.drawio", "".join(parts))


# ═════════════════════════════════════════════════════════════════════════════
# HÌNH 2.5 - BIỂU ĐỒ HOẠT ĐỘNG QUẢN LÝ KHÁCH SẠN
# ═════════════════════════════════════════════════════════════════════════════
def fig_2_5_activity_hotel_mgmt():
    parts = [_header()]
    nid = 2
    parts.append(_swimlane(nid, 40, 40, 220, 700, "Chủ khách sạn", C["blue_fill"], C["blue_stroke"])); A=nid; nid+=1
    parts.append(_swimlane(nid, 270, 40, 350, 700, "Hệ thống TravelNest", C["orange_fill"], C["orange_stroke"])); S=nid; nid+=1

    steps = [
        ("Đăng ký tài khoản\nHotel Admin", A, 20, 60),
        ("Đăng nhập", A, 20, 160),
        ("Chọn Thêm\nkhách sạn mới", A, 20, 260),
        ("Điền thông tin\nkhách sạn", A, 20, 360),
        ("Thêm phòng,\ngiá, tiện nghi", A, 20, 470),
        ("Tải ảnh\nkhách sạn", A, 20, 580),
        ("Công khai\nkhách sạn", A, 20, 650),

        ("Xác thực &\nphân quyền", S, 20, 140),
        ("Tạo hồ sơ\nkhách sạn mới", S, 20, 300),
        ("Lưu vào MySQL\n(Hotels, Rooms...)", S, 20, 420),
        ("Xử lý ảnh\n(Media Service)", S, 180, 520),
        ("Đồng bộ\nElasticsearch", S, 20, 600),
    ]
    sids = {}
    for label, parent, x, y in steps:
        parts.append(_rect(nid, x, y, 150, 50, label, C["white_fill"], C["white_stroke"],0,11,parent=parent))
        sids[label] = nid; nid+=1

    usteps = ["Đăng ký tài khoản\nHotel Admin","Đăng nhập","Chọn Thêm\nkhách sạn mới","Điền thông tin\nkhách sạn","Thêm phòng,\ngiá, tiện nghi","Tải ảnh\nkhách sạn","Công khai\nkhách sạn"]
    for i in range(len(usteps)-1):
        parts.append(_edge(nid, sids[usteps[i]], sids[usteps[i+1]], "")); nid+=1

    ssteps = ["Xác thực &\nphân quyền","Tạo hồ sơ\nkhách sạn mới","Lưu vào MySQL\n(Hotels, Rooms...)","Đồng bộ\nElasticsearch"]
    for i in range(len(ssteps)-1):
        parts.append(_edge(nid, sids[ssteps[i]], sids[ssteps[i+1]], "")); nid+=1
    parts.append(_edge(nid, sids["Tạo hồ sơ\nkhách sạn mới"], sids["Xử lý ảnh\n(Media Service)"], "")); nid+=1

    # Cross-lane
    parts.append(_edge(nid, sids["Đăng nhập"], sids["Xác thực &\nphân quyền"], "", "exitX=1;exitY=0.5;entryX=0;entryY=0.5;")); nid+=1
    parts.append(_edge(nid, sids["Điền thông tin\nkhách sạn"], sids["Tạo hồ sơ\nkhách sạn mới"], "", "exitX=1;entryX=0;")); nid+=1

    parts.append(_footer())
    write_file("fig_2_5_activity_hotel_mgmt.drawio", "".join(parts))


# ═════════════════════════════════════════════════════════════════════════════
# HÌNH 4.1 - KIẾN TRÚC TỔNG QUAN
# ═════════════════════════════════════════════════════════════════════════════
def fig_4_1_architecture():
    parts = [_header()]
    nid = 2

    # Layers as swimlanes
    # Client layer
    parts.append(_swimlane(nid, 40, 20, 1040, 140, "Client Layer", C["blue_fill"], C["blue_stroke"])); CLI=nid; nid+=1
    parts.append(_rect(nid, 80, 50, 200, 50, "Vue 3 SPA\n(User Client)", C["blue_fill"], C["blue_stroke"],1,11,True,CLI)); nid+=1
    parts.append(_rect(nid, 380, 50, 220, 50, "Nuxt 4 SSR\n(Admin Dashboard)", C["blue_fill"], C["blue_stroke"],1,11,True,CLI)); nid+=1
    parts.append(_rect(nid, 700, 50, 160, 50, "Stripe.js\n(Payment UI)", C["blue_fill"], C["blue_stroke"],1,11,True,CLI)); nid+=1

    # API Gateway / Monolith
    parts.append(_swimlane(nid, 40, 180, 1040, 220, "API Gateway / Monolith Core - Node.js + Express", C["orange_fill"], C["orange_stroke"])); API=nid; nid+=1
    for i, lbl in enumerate(["Auth\nController", "Hotel\nController", "Booking\nController", "Payment\nController", "Review\nController", "Search\nController"]):
        parts.append(_rect(nid, 60 + i*130, 50, 110, 45, lbl, C["orange_fill"], C["orange_stroke"],1,10,parent=API)); nid+=1

    # Background workers
    for i, lbl in enumerate(["Hotel\nSnapshot", "Hold\nExpiry", "Booking\nExpiry"]):
        parts.append(_rect(nid, 60 + i*130, 120, 110, 40, lbl, C["yellow_fill"], C["yellow_stroke"],1,9,parent=API)); nid+=1

    # Event Bus
    parts.append(_swimlane(nid, 40, 420, 1040, 140, "Event Bus - NATS JetStream", C["yellow_fill"], C["yellow_stroke"])); EV=nid; nid+=1
    for i, subj in enumerate(["analytics.*", "media.*", "notification.*"]):
        parts.append(_rect(nid, 100 + i*300, 50, 200, 55, f"Subject:\n{subj}", C["yellow_fill"], C["yellow_stroke"],1,10,True,EV)); nid+=1

    # Go Microservices
    parts.append(_swimlane(nid, 40, 580, 1040, 140, "Go Microservices", C["green_fill"], C["green_stroke"])); GO=nid; nid+=1
    for i,(name,db) in enumerate([("Analytics\nService","MongoDB"),("Media\nService","MinIO"),("Notification\nService","MySQL")]):
        parts.append(_rect(nid, 80+i*320, 45, 140, 55, name, C["green_fill"], C["green_stroke"],1,12,True,GO)); nid+=1

    # Infrastructure
    parts.append(_swimlane(nid, 40, 740, 1040, 120, "Infrastructure / Data Stores", C["grey_fill"], C["grey_stroke"])); INF=nid; nid+=1
    for i,(name,fill) in enumerate([("MySQL 8",C["green_fill"]),("Redis 7",C["red_fill"]),("Elasticsearch\n8.11",C["blue_fill"]),("MongoDB",C["green_fill"]),("ClickHouse","#ffe6cc"),("MinIO",C["purple_fill"])]):
        parts.append(_cyl(nid, 60+i*155, 25, 130, 60, name, fill, C["grey_stroke"], INF)); nid+=1

    # Vertical edges between layers (key ones)
    parts.append(_edge(nid, "3", "10", "REST/HTTPS", "exitX=0.5;exitY=1;entryX=0.5;entryY=0;fontColor=#555;")); nid+=1
    parts.append(_edge(nid, "10", "35", "Publish\nEvents", "exitX=0.5;exitY=1;entryX=0.5;entryY=0;fontColor=#555;")); nid+=1
    parts.append(_edge(nid, "35", "50", "Consume\nEvents", "exitX=0.5;exitY=1;entryX=0.5;entryY=0;fontColor=#555;")); nid+=1

    parts.append(_footer())
    write_file("fig_4_1_architecture.drawio", "".join(parts))


# ═════════════════════════════════════════════════════════════════════════════
# HÌNH 4.2 - BIỂU ĐỒ GÓI UML BACKEND NODE.JS
# ═════════════════════════════════════════════════════════════════════════════
def fig_4_2_package_diagram():
    parts = [_header()]
    nid = 2

    pkg = lambda uid, x, y, w, h, label, fill, stroke: f'<mxCell id="{uid}" value="{escape(label)}" style="shape=folder;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};fontStyle=1;fontSize=12;collapsible=0;tabWidth=80;tabHeight=26;tabPosition=left;" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'

    pkg_specs = [
        (40, 40, 160, 60, "Routes\n(v1/)", C["blue_fill"], C["blue_stroke"]),
        (220, 40, 160, 60, "Middlewares", C["purple_fill"], C["purple_stroke"]),
        (400, 40, 160, 60, "Controllers", C["orange_fill"], C["orange_stroke"]),
        (580, 40, 160, 60, "Validators\n(Joi)", C["red_fill"], C["red_stroke"]),
        (100, 140, 180, 60, "Services\n(Business Logic)", C["green_fill"], C["green_stroke"]),
        (320, 140, 180, 60, "Repositories\n(Data Access)", C["yellow_fill"], C["yellow_stroke"]),
        (540, 140, 180, 60, "Models\n(Sequelize)", C["grey_fill"], C["grey_stroke"]),
        (100, 240, 180, 60, "Events\n(NATS Publisher)", C["orange_fill"], C["orange_stroke"]),
        (320, 240, 180, 60, "Queues &\nWorkers (BullMQ)", C["yellow_fill"], C["yellow_stroke"]),
        (540, 240, 180, 60, "Adapters\n(Stripe,Email)", C["grey_fill"], C["grey_stroke"]),
        (220, 340, 180, 60, "Socket.IO", C["blue_fill"], C["blue_stroke"]),
    ]
    pkg_ids = []
    for x, y, w, h, label, fill, stroke in pkg_specs:
        parts.append(pkg(nid, x, y, w, h, label, fill, stroke))
        pkg_ids.append(nid)
        nid += 1

    # Dependency edges between packages
    deps = [
        (0, 2), (0, 4), (1, 2), (1, 4), (2, 4), (2, 6), (2, 8), (2, 10),
        (4, 6), (4, 8), (6, 8), (6, 10), (8, 10),
        (8, 9), (10, 8), (10, 9),
    ]
    for si, ti in deps:
        if si < len(pkg_ids) and ti < len(pkg_ids):
            parts.append(_edge(nid, str(pkg_ids[si]), str(pkg_ids[ti]), "", "dashed=1;endArrow=open;"))
            nid += 1

    parts.append(_footer())
    write_file("fig_4_2_package_diagram.drawio", "".join(parts))


# ═════════════════════════════════════════════════════════════════════════════
# HÌNH 4.3 - THIẾT KẾ CHI TIẾT GÓI AUTH
# ═════════════════════════════════════════════════════════════════════════════
def fig_4_3_auth_package():
    parts = [_header()]
    nid = 2
    # UML class boxes (styled as swimlanes)
    cls = lambda uid, x, y, w, h, label, fill=C["blue_fill"], stroke=C["blue_stroke"]: f'<mxCell id="{uid}" value="{escape(label)}" style="swimlane;fontStyle=0;align=center;startSize=28;html=1;fillColor={fill};strokeColor={stroke};whiteSpace=wrap;container=1;collapsible=0;" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'

    parts.append(cls(nid, 40, 40, 180, 100, "User&#xa;- id&#xa;- email&#xa;- passwordHash&#xa;- firstName&#xa;- lastName")); U = nid; nid+=1
    parts.append(cls(nid, 300, 40, 180, 80, "AuthAccount&#xa;- provider&#xa;- providerId&#xa;- userId")); AA = nid; nid+=1
    parts.append(cls(nid, 560, 40, 180, 90, "Role&#xa;- id&#xa;- name")); R = nid; nid+=1
    parts.append(cls(nid, 40, 200, 180, 80, "UserRole&#xa;- userId&#xa;- roleId")); UR = nid; nid+=1
    parts.append(cls(nid, 300, 200, 200, 90, "Permission&#xa;- id&#xa;- name&#xa;- resource")); P = nid; nid+=1
    parts.append(cls(nid, 560, 200, 200, 80, "RolePermission&#xa;- roleId&#xa;- permissionId")); RP = nid; nid+=1
    parts.append(cls(nid, 200, 360, 220, 70, "AuthService&#xa;+ register()&#xa;+ login()&#xa;+ logout()", C["green_fill"], C["green_stroke"])); AS = nid; nid+=1
    parts.append(cls(nid, 500, 360, 220, 70, "Passport Middleware&#xa;+ LocalStrategy&#xa;+ GoogleStrategy&#xa;+ TwitterStrategy", C["yellow_fill"], C["yellow_stroke"])); PM = nid; nid+=1

    # Edges
    parts.append(_edge(nid, U, AA, "1 → *", "endArrow=block;endFill=0;")); nid+=1
    parts.append(_edge(nid, U, UR, "1 → *", "endArrow=block;endFill=0;")); nid+=1
    parts.append(_edge(nid, R, UR, "1 → *", "endArrow=block;endFill=0;")); nid+=1
    parts.append(_edge(nid, R, RP, "1 → *", "endArrow=block;endFill=0;")); nid+=1
    parts.append(_edge(nid, P, RP, "1 → *", "endArrow=block;endFill=0;")); nid+=1
    parts.append(_edge(nid, AS, PM, "uses", "dashed=1;endArrow=open;")); nid+=1

    parts.append(_footer())
    write_file("fig_4_3_auth_package.drawio", "".join(parts))


# ═════════════════════════════════════════════════════════════════════════════
# HÌNH 4.4 - THIẾT KẾ CHI TIẾT GÓI BOOKING
# ═════════════════════════════════════════════════════════════════════════════
def fig_4_4_booking_package():
    parts = [_header()]
    nid = 2
    cls = lambda uid, x, y, w, h, label, fill=C["blue_fill"], stroke=C["blue_stroke"]: f'<mxCell id="{uid}" value="{escape(label)}" style="swimlane;fontStyle=0;align=center;startSize=28;html=1;fillColor={fill};strokeColor={stroke};whiteSpace=wrap;container=1;collapsible=0;" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'

    parts.append(cls(nid, 20, 20, 180, 100, "Hold&#xa;- id&#xa;- userId&#xa;- hotelId&#xa;- expiresAt&#xa;- status")); H = nid; nid+=1
    parts.append(cls(nid, 250, 20, 180, 100, "HoldRoom&#xa;- holdId&#xa;- roomId&#xa;- quantity&#xa;- checkIn&#xa;- checkOut")); HR = nid; nid+=1
    parts.append(cls(nid, 500, 20, 180, 100, "Booking&#xa;- id&#xa;- userId&#xa;- totalAmount&#xa;- status&#xa;- checkIn&#xa;- checkOut")); B = nid; nid+=1
    parts.append(cls(nid, 730, 20, 180, 90, "BookingRoom&#xa;- bookingId&#xa;- roomId&#xa;- pricePerNight")); BR = nid; nid+=1
    parts.append(cls(nid, 250, 160, 180, 90, "Payment&#xa;- id&#xa;- bookingId&#xa;- stripePaymentId&#xa;- amount&#xa;- status")); PY = nid; nid+=1
    parts.append(cls(nid, 500, 160, 180, 80, "LedgerEntry&#xa;- id&#xa;- paymentId&#xa;- entryType&#xa;- amount")); LE = nid; nid+=1
    parts.append(cls(nid, 730, 160, 170, 70, "IdempotencyKey&#xa;- key&#xa;- status")); IK = nid; nid+=1
    parts.append(cls(nid, 20, 320, 200, 80, "HoldService&#xa;+ createHold()&#xa;+ expireHold()", C["green_fill"], C["green_stroke"])); HS=nid;nid+=1
    parts.append(cls(nid, 260, 320, 200, 80, "BookingService&#xa;+ confirmBooking()&#xa;+ cancelBooking()", C["green_fill"], C["green_stroke"])); BS=nid;nid+=1
    parts.append(cls(nid, 500, 320, 200, 80, "PaymentService&#xa;+ createPaymentIntent()&#xa;+ handleWebhook()", C["yellow_fill"], C["yellow_stroke"])); PS=nid;nid+=1
    parts.append(cls(nid, 740, 320, 200, 80, "LedgerService&#xa;+ createEntries()&#xa;+ getBalance()", C["green_fill"], C["green_stroke"])); LS=nid;nid+=1

    # Edges
    parts.append(_edge(nid, H, HR, "1 → *", "endArrow=block;endFill=0;")); nid+=1
    parts.append(_edge(nid, B, BR, "1 → *", "endArrow=block;endFill=0;")); nid+=1
    parts.append(_edge(nid, B, PY, "1 → 1", "endArrow=block;endFill=0;")); nid+=1
    parts.append(_edge(nid, PY, LE, "1 → *", "endArrow=block;endFill=0;")); nid+=1
    parts.append(_edge(nid, PY, IK, "1 → 1", "endArrow=block;endFill=0;dashed=1;")); nid+=1
    # Service edges
    parts.append(_edge(nid, HS, BS, "converts", "dashed=1;endArrow=open;")); nid+=1
    parts.append(_edge(nid, BS, PS, "calls", "dashed=1;endArrow=open;")); nid+=1
    parts.append(_edge(nid, PS, LS, "calls", "dashed=1;endArrow=open;")); nid+=1

    parts.append(_footer())
    write_file("fig_4_4_booking_package.drawio", "".join(parts))


# ═════════════════════════════════════════════════════════════════════════════
# HÌNH 4.7 - BIỂU ĐỒ LỚP CHO QUY TRÌNH ĐẶT PHÒNG
# ═════════════════════════════════════════════════════════════════════════════
def fig_4_7_class_booking():
    parts = [_header()]
    nid = 2
    cls = lambda uid, x, y, w, h, label, fill=C["blue_fill"], stroke=C["blue_stroke"]: f'<mxCell id="{uid}" value="{escape(label)}" style="swimlane;fontStyle=0;align=left;startSize=26;html=1;fillColor={fill};strokeColor={stroke};whiteSpace=wrap;container=1;collapsible=0;fontSize=10;" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'

    # UML class boxes with attributes/methods
    parts.append(cls(nid, 40, 40, 180, 160,
        "Hotel&#xa;━━━━━━━━━&#xa;- id: int&#xa;- name: string&#xa;- address: string&#xa;- cityId: int&#xa;- latitude: float&#xa;- longitude: float&#xa;━━━━━━━━━&#xa;+ getRooms()&#xa;+ getRatingAvg()")); HOT=nid;nid+=1
    parts.append(cls(nid, 280, 40, 180, 130,
        "Room&#xa;━━━━━━━━━&#xa;- id: int&#xa;- hotelId: int&#xa;- name: string&#xa;- basePrice: decimal&#xa;- capacity: int&#xa;━━━━━━━━━&#xa;+ getInventory()")); RM=nid;nid+=1
    parts.append(cls(nid, 520, 40, 200, 100,
        "RoomInventory&#xa;━━━━━━━━━&#xa;- roomId: int&#xa;- date: date&#xa;- availableCount: int&#xa;- price: decimal&#xa;━━━━━━━━━&#xa;+ isAvailable()")); RI=nid;nid+=1
    parts.append(cls(nid, 780, 40, 180, 140,
        "Booking&#xa;━━━━━━━━━&#xa;- id: int&#xa;- userId: int&#xa;- checkIn: date&#xa;- checkOut: date&#xa;- totalAmount: decimal&#xa;- status: enum&#xa;━━━━━━━━━&#xa;+ confirm()&#xa;+ cancel()")); BK=nid;nid+=1
    parts.append(cls(nid, 40, 260, 180, 100,
        "Hold&#xa;━━━━━━━━━&#xa;- id: int&#xa;- userId: int&#xa;- expiresAt: datetime&#xa;- status: enum&#xa;━━━━━━━━━&#xa;+ convert()&#xa;+ expire()")); HL=nid;nid+=1
    parts.append(cls(nid, 280, 240, 200, 130,
        "BookingRoom&#xa;━━━━━━━━━&#xa;- bookingId: int&#xa;- roomId: int&#xa;- quantity: int&#xa;- pricePerNight: decimal&#xa;━━━━━━━━━&#xa;+ getSubtotal()")); BRM=nid;nid+=1
    parts.append(cls(nid, 550, 220, 180, 120,
        "Payment&#xa;━━━━━━━━━&#xa;- id: int&#xa;- bookingId: int&#xa;- stripePaymentId: string&#xa;- amount: decimal&#xa;- status: enum&#xa;━━━━━━━━━&#xa;+ process()&#xa;+ refund()")); PMT=nid;nid+=1
    parts.append(cls(nid, 780, 230, 190, 100,
        "LedgerEntry&#xa;━━━━━━━━━&#xa;- id: int&#xa;- paymentId: int&#xa;- entryType: enum&#xa;- amount: decimal&#xa;━━━━━━━━━&#xa;+ getBalance()")); LE=nid;nid+=1
    parts.append(cls(nid, 40, 430, 180, 70,
        "User&#xa;━━━━━━━━━&#xa;- id: int&#xa;- email: string&#xa;- firstName: string")); US=nid;nid+=1

    # Edges with UML notation
    parts.append(_edge(nid, HOT, RM, "1 → *", "endArrow=block;endFill=0;fontSize=9;")); nid+=1
    parts.append(_edge(nid, RM, RI, "1 → *", "endArrow=block;endFill=0;fontSize=9;")); nid+=1
    parts.append(_edge(nid, BK, BRM, "1 → *", "endArrow=block;endFill=0;fontSize=9;")); nid+=1
    parts.append(_edge(nid, RM, BRM, "1 → *", "endArrow=block;endFill=0;fontSize=9;")); nid+=1
    parts.append(_edge(nid, BK, PMT, "1 → 1", "endArrow=block;endFill=0;fontSize=9;")); nid+=1
    parts.append(_edge(nid, PMT, LE, "1 → *", "endArrow=block;endFill=0;fontSize=9;")); nid+=1
    parts.append(_edge(nid, US, BK, "1 → *", "endArrow=block;endFill=0;fontSize=9;")); nid+=1
    parts.append(_edge(nid, US, HL, "1 → *", "endArrow=block;endFill=0;fontSize=9;")); nid+=1
    parts.append(_edge(nid, HL, BK, "converts to", "dashed=1;endArrow=open;fontSize=9;")); nid+=1

    parts.append(_footer())
    write_file("fig_4_7_class_booking.drawio", "".join(parts))


# ═════════════════════════════════════════════════════════════════════════════
# HÌNH 4.8 - BIỂU ĐỒ TRÌNH TỰ ĐẶT PHÒNG — use seqlayout.py script
# ═════════════════════════════════════════════════════════════════════════════
def fig_4_8_sequence():
    import json, subprocess
    seq_json = {
        "title": "Sequence - Đặt phòng TravelNest",
        "participants": [
            {"id":"u","label":"Người dùng", "actor":True},
            {"id":"hc","label":"HoldController"},
            {"id":"hs","label":"HoldService"},
            {"id":"pc","label":"PaymentController"},
            {"id":"ps","label":"PaymentService"},
            {"id":"sc","label":"WebhookController"},
            {"id":"bs","label":"BookingService"},
            {"id":"stripe","label":"Stripe"},
            {"id":"email","label":"Email/Socket.IO"}
        ],
        "messages": [
            {"from":"u","to":"hc","label":"POST /holds"},
            {"from":"hc","to":"hs","label":"createHold(data)"},
            {"from":"hs","to":"hs","label":"Kiểm tra phòng trống"},
            {"from":"hc","to":"u","label":"Hold created (200)", "return":True},
            {"from":"u","to":"pc","label":"POST /payments"},
            {"from":"pc","to":"ps","label":"createPaymentIntent()"},
            {"from":"ps","to":"stripe","label":"Create PaymentIntent"},
            {"from":"stripe","to":"ps","label":"client_secret","return":True},
            {"from":"ps","to":"pc","label":"client_secret","return":True},
            {"from":"pc","to":"u","label":"Stripe Elements UI","return":True},
            {"from":"u","to":"stripe","label":"Xác nhận thanh toán"},
            {"from":"stripe","to":"sc","label":"Webhook: payment_intent.succeeded"},
            {"from":"sc","to":"ps","label":"handleWebhook(event)"},
            {"from":"ps","to":"bs","label":"confirmBooking(holdId)"},
            {"from":"bs","to":"bs","label":"Hold → Booking"},
            {"from":"bs","to":"email","label":"Publish event (NATS)","async":True},
            {"from":"email","to":"u","label":"Email xác nhận","note":"Real-time + Email", "over":"u"},
        ]
    }
    json_path = os.path.join(OUTDIR, "_seq_booking.json")
    with open(json_path, 'w') as f:
        json.dump(seq_json, f, indent=2)
    script = os.path.join(os.path.expanduser('~'), '.agents', 'skills', 'drawio-skill', 'scripts', 'seqlayout.py')
    out = os.path.join(OUTDIR, "fig_4_8_sequence_booking.drawio")
    subprocess.run(["python3", script, json_path, "-o", out], check=True)
    os.remove(json_path)
    print("  Created fig_4_8_sequence_booking.drawio")


# ═════════════════════════════════════════════════════════════════════════════
# HÌNH 4.9 - ERD BIỂU ĐỒ THỰC THỂ LIÊN KẾT
# ═════════════════════════════════════════════════════════════════════════════
def fig_4_9_erd():
    parts = [_header()]
    nid = 2

    tbl = lambda uid, x, y, w, h, label, fill=C["blue_fill"], stroke=C["blue_stroke"]: f'<mxCell id="{uid}" value="{escape(label)}" style="shape=table;startSize=30;container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=0;fontStyle=1;strokeColor={stroke};fillColor={fill};whiteSpace=wrap;html=1;fontSize=10;" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'

    row = lambda uid, label, parent, bold=False: f'<mxCell id="{uid}" value="{escape(label)}" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=none;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontSize=10;fontStyle={1 if bold else 0};" vertex="1" parent="{parent}"><mxGeometry y="{30}" width="{160}" height="26" as="geometry"/></mxCell>'

    tables = [
        ("Users", [("id: int PK", True),("email: varchar", False),("passwordHash: varchar", False),("firstName: varchar", False),("lastName: varchar", False)], 40, 40),
        ("Hotels", [("id: int PK", True),("name: varchar", False),("address: text", False),("cityId: int FK", False),("latitude: float", False),("longitude: float", False)], 280, 40),
        ("Rooms", [("id: int PK", True),("hotelId: int FK", False),("name: varchar", False),("basePrice: decimal", False),("capacity: int", False)], 520, 40),
        ("RoomInventories", [("roomId: int PK,FK", True),("date: date PK", True),("availableCount: int", False),("price: decimal", False)], 760, 40),
        ("Bookings", [("id: int PK", True),("userId: int FK", False),("checkIn: date", False),("checkOut: date", False),("totalAmount: decimal", False),("status: enum", False)], 40, 280),
        ("BookingRooms", [("bookingId: int PK,FK", True),("roomId: int PK,FK", True),("pricePerNight: decimal", False)], 280, 280),
        ("Payments", [("id: int PK", True),("bookingId: int FK", False),("amount: decimal", False),("stripePaymentId: varchar", False),("status: enum", False)], 520, 280),
        ("LedgerEntries", [("id: int PK", True),("paymentId: int FK", False),("entryType: enum", False),("amount: decimal", False)], 760, 280),
        ("Reviews", [("id: int PK", True),("userId: int FK", False),("hotelId: int FK", False),("rating: int", False),("content: text", False)], 40, 500),
        ("Holds", [("id: int PK", True),("userId: int FK", False),("hotelId: int FK", False),("expiresAt: datetime", False),("status: enum", False)], 280, 500),
        ("HoldRooms", [("holdId: int PK,FK", True),("roomId: int PK,FK", True),("quantity: int", False)], 520, 500),
        ("Roles", [("id: int PK", True),("name: varchar", False)], 760, 500),
        ("UserRoles", [("userId: int PK,FK", True),("roleId: int PK,FK", True)], 40, 700),
        ("HotelAmenities", [("hotelId: int PK,FK", True),("amenityId: int PK,FK", True)], 280, 700),
    ]

    tbl_ids = {}
    for name, cols, x, y in tables:
        t = tbl(nid, x, y, 200, 30 + len(cols)*26, name)
        parts.append(t)
        tid = nid; nid+=1
        tbl_ids[name] = tid
        for col_name, bold in cols:
            parts.append(row(nid, col_name, tid, bold)); nid+=1

    # FK edges (crow's foot)
    fk_edge_style = "endArrow=ERmandOne;startArrow=ERone;fontSize=8;"
    fks = [
        ("Hotels", "Rooms"),
        ("Rooms", "RoomInventories"),
        ("Users", "Bookings"),
        ("Hotels", "Bookings"),
        ("Bookings", "BookingRooms"),
        ("Rooms", "BookingRooms"),
        ("Bookings", "Payments"),
        ("Payments", "LedgerEntries"),
        ("Users", "Reviews"),
        ("Hotels", "Reviews"),
        ("Users", "Holds"),
        ("Hotels", "Holds"),
        ("Holds", "HoldRooms"),
        ("Rooms", "HoldRooms"),
        ("Users", "UserRoles"),
        ("Roles", "UserRoles"),
        ("Hotels", "HotelAmenities"),
    ]
    for src, tgt in fks:
        if src in tbl_ids and tgt in tbl_ids:
            parts.append(_edge(nid, tbl_ids[src], tbl_ids[tgt], "", fk_edge_style)); nid+=1

    parts.append(_footer())
    write_file("fig_4_9_erd.drawio", "".join(parts))


# ═════════════════════════════════════════════════════════════════════════════
# HÌNH 4.12 - SƠ ĐỒ TRIỂN KHAI KUBERNETES
# ═════════════════════════════════════════════════════════════════════════════
def fig_4_12_deployment():
    parts = [_header()]
    nid = 2

    # K8s cluster boundary
    parts.append(f'<mxCell id="{nid}" value="Kubernetes Cluster (k3s)" style="swimlane;startSize=30;fillColor={C["blue_fill"]};strokeColor={C["blue_stroke"]};whiteSpace=wrap;html=1;fontStyle=1;fontSize=14;" vertex="1" parent="1"><mxGeometry x="30" y="30" width="1080" height="500" as="geometry"/></mxCell>')
    CL = nid; nid+=1

    # Apps namespace
    parts.append(f'<mxCell id="{nid}" value="" style="group;pointerEvents=0;" vertex="1" parent="{CL}"><mxGeometry x="20" y="50" width="680" height="420" as="geometry"/></mxCell>'); nid+=1
    parts.append(_rect(nid, 20, 45, 680, 30, "Apps (Deployments)", C["green_fill"], C["green_stroke"],1,12,True,CL)); nid+=1

    apps = ["api\n(Express)","frontend\n(Nginx+Vue3)","admin-client\n(Nuxt4)","worker\n(BullMQ)","analytics\n(Go)","media\n(Go)","notification\n(Go)"]
    for i, app in enumerate(apps):
        parts.append(_rect(nid, 40 + i*95, 95, 85, 50, app, C["green_fill"], C["green_stroke"],1,9,parent=CL)); nid+=1

    # Infra namespace
    parts.append(f'<mxCell id="{nid}" value="" style="group;pointerEvents=0;" vertex="1" parent="{CL}"><mxGeometry x="720" y="50" width="340" height="420" as="geometry"/></mxCell>'); nid+=1
    parts.append(_rect(nid, 720, 45, 340, 30, "Infrastructure (StatefulSets)", C["orange_fill"], C["orange_stroke"],1,12,True,CL)); nid+=1

    infra = ["mysql","redis","nats","minio","keycloak"]
    for i, inf in enumerate(infra):
        parts.append(_cyl(nid, 740 + (i%3)*110, 95 + (i//3)*120, 100, 60, inf, C["orange_fill"], C["orange_stroke"], CL)); nid+=1

    # External
    parts.append(_rect(nid, 30, 570, 200, 60, "Cloudflare Tunnel\n(Public Ingress)", C["grey_fill"], C["grey_stroke"],1,10)); nid+=1
    parts.append(_rect(nid, 270, 570, 160, 60, "GitHub Actions\n(CI/CD)", C["grey_fill"], C["grey_stroke"],1,10)); nid+=1
    parts.append(_rect(nid, 470, 570, 160, 60, "Argo CD\n(GitOps Sync)", C["grey_fill"], C["grey_stroke"],1,10)); nid+=1
    parts.append(_rect(nid, 670, 570, 160, 60, "External Services\n(Stripe, MongoDB)", C["grey_fill"], C["grey_stroke"],1,10)); nid+=1
    parts.append(_rect(nid, 870, 570, 160, 60, "Users\n(Browser)", C["blue_fill"], C["blue_stroke"],1,10)); nid+=1

    # Edges
    parts.append(_edge(nid, "86", "8", "HTTPS", "exitX=0.5;exitY=0;entryX=0.5;entryY=1;")); nid+=1
    parts.append(_edge(nid, "88", "8", "Push Images", "exitX=0.5;exitY=0;entryX=0.5;entryY=1;")); nid+=1
    parts.append(_edge(nid, "89", "8", "Sync Manifests", "exitX=0.5;exitY=0;entryX=0.5;entryY=1;")); nid+=1

    parts.append(_footer())
    write_file("fig_4_12_deployment.drawio", "".join(parts))


# ═════════════════════════════════════════════════════════════════════════════
# HÌNH 5.1 - STRANGLER FIG MIGRATION LỘ TRÌNH
# ═════════════════════════════════════════════════════════════════════════════
def fig_5_1_strangler_fig():
    parts = [_header()]
    nid = 2

    phases = [
        ("Phase 1\nNATS Infrastructure", True),
        ("Phase 2\nAnalytics Service", True),
        ("Phase 3\nMedia Service", True),
        ("Phase 4\nNotification\nService", True),
        ("Phase 5\nSearch Service", False),
        ("Phase 6\nCatalog Service", False),
        ("Phase 7\nBooking Service", False),
        ("Phase 8\nPayment Service", False),
        ("Phase 9\nIdentity Service", False),
    ]
    for i, (name, done) in enumerate(phases):
        fill = C["green_fill"] if done else C["grey_fill"]
        stroke = C["green_stroke"] if done else C["grey_stroke"]
        parts.append(_rect(nid, 60 + i*110, 100, 100, 70, name, fill, stroke, 1, 10, True)); nid+=1
        if i > 0:
            parts.append(_edge(nid, nid-2, nid-1, "")); nid+=1

    # Legend
    parts.append(_rect(nid, 60, 220, 150, 30, "Màu xanh: Đã hoàn thành", C["green_fill"], C["green_stroke"],1,9)); nid+=1
    parts.append(_rect(nid, 250, 220, 150, 30, "Màu xám: Kế hoạch tương lai", C["grey_fill"], C["grey_stroke"],1,9)); nid+=1

    parts.append(_footer())
    write_file("fig_5_1_strangler_fig.drawio", "".join(parts))


# ═════════════════════════════════════════════════════════════════════════════
# HÌNH 5.2 - NATS JETSTREAM ARCHITECTURE
# ═════════════════════════════════════════════════════════════════════════════
def fig_5_2_nats():
    parts = [_header()]
    nid = 2

    # Node.js Publisher side
    parts.append(_swimlane(nid, 30, 40, 300, 400, "Node.js Monolith (Publisher)", C["blue_fill"], C["blue_stroke"])); NJ=nid;nid+=1
    nj_modules = ["BookingController","HotelController","ReviewController","SearchController"]
    for i,m in enumerate(nj_modules):
        parts.append(_rect(nid, 30, 60 + i*80, 180, 50, m, C["blue_fill"], C["blue_stroke"],1,10,parent=NJ)); nid+=1

    # NATS Central
    parts.append(_swimlane(nid, 380, 40, 300, 400, "NATS JetStream Server", C["yellow_fill"], C["yellow_stroke"])); NAT=nid;nid+=1
    streams = ["analytics.search","analytics.hotel_view","media.image_upload","notification.booking_confirmed","notification.review_created"]
    for i,s in enumerate(streams):
        parts.append(_rect(nid, 30, 60 + i*65, 240, 45, f"Stream: {s}", C["yellow_fill"], C["yellow_stroke"],1,9,parent=NAT)); nid+=1
        parts.append(_edge(nid, nid-5-(5-i), nid-1, "publish")); nid+=1

    # Go Consumers
    parts.append(_swimlane(nid, 730, 40, 300, 400, "Go Microservices (Consumers)", C["green_fill"], C["green_stroke"])); GO=nid;nid+=1
    go_svcs = [("Analytics\nService", 2), ("Media\nService", 1), ("Notification\nService", 2)]
    for i,(svc, streams_count) in enumerate(go_svcs):
        parts.append(_rect(nid, 30, 60 + i*120, 180, 60, svc, C["green_fill"], C["green_stroke"],1,11,True,GO)); nid+=1
        for j in range(streams_count):
            parts.append(_rect(nid, 30, 130 + i*120 + j*30, 180, 25, f"consumer-{j+1}", C["green_fill"], C["green_stroke"],1,8,parent=GO)); nid+=1

    parts.append(_footer())
    write_file("fig_5_2_nats.drawio", "".join(parts))


# ═════════════════════════════════════════════════════════════════════════════
# HÌNH 5.3 - SƠ ĐỒ XỬ LÝ THANH TOÁN
# ═════════════════════════════════════════════════════════════════════════════
def fig_5_3_payment_flow():
    parts = [_header()]
    nid = 2

    # Swimlanes
    parts.append(_swimlane(nid, 30, 30, 200, 650, "Người dùng", C["blue_fill"], C["blue_stroke"])); U=nid;nid+=1
    parts.append(_swimlane(nid, 240, 30, 280, 650, "TravelNest API", C["orange_fill"], C["orange_stroke"])); A=nid;nid+=1
    parts.append(_swimlane(nid, 530, 30, 220, 650, "Stripe", C["grey_fill"], C["grey_stroke"])); S=nid;nid+=1

    def box(uid, x, y, w, h, label, parent, fill=C["white_fill"], stroke=C["white_stroke"]):
        return _rect(uid, x, y, w, h, label, fill, stroke, 0, 10, parent=parent)

    steps = [
        (U, 20, 50, 160, 40, "Bắt đầu\nthanh toán"),
        (U, 20, 140, 160, 40, "Nhập thông tin\nthẻ (Stripe Elements)"),
        (U, 20, 280, 160, 40, "Xác nhận\nthanh toán"),
        (U, 20, 550, 160, 40, "Nhận email\nxác nhận"),

        (A, 20, 50, 160, 40, "Tạo PaymentIntent\n+ IdempotencyKey"),
        (A, 20, 170, 160, 40, "Lưu IdempotencyKey\n(status: processing)"),
        (A, 20, 300, 160, 40, "Nhận webhook\npayment_intent.succeeded"),
        (A, 20, 410, 160, 40, "Cập nhật Payment\n+ LedgerEntries"),
        (A, 20, 520, 160, 40, "Cập nhật Booking\n+ RoomInventory"),
        (A, 20, 590, 160, 40, "Gửi email xác nhận\n+ NATS event"),

        (S, 20, 50, 180, 40, "Nhận PaymentIntent\n(từ API)"),
        (S, 20, 200, 180, 40, "Xử lý thanh toán\n(ngân hàng)"),
        (S, 20, 340, 180, 40, "Gửi webhook\nvề TravelNest"),
    ]
    sids = {}
    for parent, x, y, w, h, label in steps:
        parts.append(box(nid, x, y, w, h, label, parent))
        sids[(label,parent)] = nid; nid+=1

    # Decision nodes
    parts.append(_diamond(nid, 40, 200, 100, 50, "Key\ntồn tại?")); D1=nid;nid+=1
    parts.append(_diamond(nid, 40, 430, 100, 50, "Thanh toán\nthành công?")); D2=nid;nid+=1

    # Edges - keys in sids are (label, parent)
    u_flow = [("Bắt đầu\nthanh toán",U), ("Nhập thông tin\nthẻ (Stripe Elements)",U), ("Xác nhận\nthanh toán",U)]
    for i in range(len(u_flow)-1):
        parts.append(_edge(nid, str(sids[u_flow[i]]), str(sids[u_flow[i+1]]), "")); nid+=1

    a_flow = [("Tạo PaymentIntent\n+ IdempotencyKey",A), ("Lưu IdempotencyKey\n(status: processing)",A), ("Nhận webhook\npayment_intent.succeeded",A), ("Cập nhật Payment\n+ LedgerEntries",A), ("Cập nhật Booking\n+ RoomInventory",A), ("Gửi email xác nhận\n+ NATS event",A)]
    for i in range(len(a_flow)-1):
        parts.append(_edge(nid, str(sids[a_flow[i]]), str(sids[a_flow[i+1]]), "")); nid+=1

    s_flow = [("Nhận PaymentIntent\n(từ API)",S), ("Xử lý thanh toán\n(ngân hàng)",S), ("Gửi webhook\nvề TravelNest",S)]
    for i in range(len(s_flow)-1):
        parts.append(_edge(nid, str(sids[s_flow[i]]), str(sids[s_flow[i+1]]), "")); nid+=1

    # Cross-lane
    parts.append(_edge(nid, str(sids[("Bắt đầu\nthanh toán",U)]), str(sids[("Tạo PaymentIntent\n+ IdempotencyKey",A)]), "", "exitX=1;exitY=0.5;entryX=0;entryY=0.5;")); nid+=1
    parts.append(_edge(nid, str(sids[("Tạo PaymentIntent\n+ IdempotencyKey",A)]), str(sids[("Nhận PaymentIntent\n(từ API)",S)]), "", "exitX=1;entryX=0;")); nid+=1
    parts.append(_edge(nid, str(sids[("Gửi webhook\nvề TravelNest",S)]), str(sids[("Nhận webhook\npayment_intent.succeeded",A)]), "", "exitX=0;entryX=1;")); nid+=1

    parts.append(_footer())
    write_file("fig_5_3_payment_flow.drawio", "".join(parts))


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("Generating TravelNest diagrams...")
    fig_2_1_use_case_overview()
    fig_2_2_use_case_booking()
    fig_2_3_use_case_hotel_mgmt()
    fig_2_4_activity_booking()
    fig_2_5_activity_hotel_mgmt()
    fig_4_1_architecture()
    fig_4_2_package_diagram()
    fig_4_3_auth_package()
    fig_4_4_booking_package()
    fig_4_7_class_booking()
    fig_4_8_sequence()  # uses seqlayout.py
    fig_4_9_erd()
    fig_4_12_deployment()
    fig_5_1_strangler_fig()
    fig_5_2_nats()
    fig_5_3_payment_flow()
    print("Done! All .drawio files created.")
