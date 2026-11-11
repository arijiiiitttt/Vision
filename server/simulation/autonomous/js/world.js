// "Real world" ground for the simulator: buildings, roads, parks and water from OpenStreetMap (free, no account).
// One scene unit is about one metre. North is "forward" (-z), east is right (+x).
// Data comes from the Overpass API in one request, is cached in this browser, and if anything fails the caller
// simply keeps the old black floor. Map data (c) OpenStreetMap contributors, ODbL.
export const World = (function () {
    // ---- the one place to change -------------------------------------------------------------------------
    const DEFAULT_PLACE = { name: "Connaught Place, New Delhi", lat: 28.6315, lon: 77.2167, radius: 350 };
    // (or set localStorage "vision.world.place" to {"name":"...","lat":..,"lon":..,"radius":300} and reload)
    // -------------------------------------------------------------------------------------------------------
    const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
    const CACHE_PREFIX = "vision.world.v1:";
    const CACHE_DAYS = 30, MAX_BUILDINGS = 1200, MAX_ROADS = 2500;
    const ROAD_WIDTH = { motorway: 14, trunk: 13, primary: 12, secondary: 10, tertiary: 8, residential: 6, unclassified: 6, service: 3.5, living_street: 5, pedestrian: 5, footway: 1.6, path: 1.4, cycleway: 2, steps: 1.6, track: 3 };
    let THREE_ = null, scene = null, group = null, place = null, state = "off", fogWas = null, setGround = () => { }, attrEl = null;
    function getPlace() {
        try {
            const raw = localStorage.getItem("vision.world.place");
            if (raw) {
                const p = JSON.parse(raw);
                if (Number.isFinite(p.lat) && Number.isFinite(p.lon))
                    return { name: String(p.name || "Custom place"), lat: p.lat, lon: p.lon, radius: Math.min(600, Math.max(100, Number(p.radius) || 300)) };
            }
        }
        catch { /* bad saved place: use the default */ }
        return DEFAULT_PLACE;
    }
    function project(p) {
        const k = Math.cos((p.lat * Math.PI) / 180);
        return (lat, lon) => ({ x: (lon - p.lon) * k * 111320, z: -(lat - p.lat) * 110574 });
    }
    function cacheKey(p) { return `${CACHE_PREFIX}${p.lat.toFixed(4)},${p.lon.toFixed(4)},${p.radius}`; }
    function readCache(p) {
        try {
            const raw = localStorage.getItem(cacheKey(p));
            if (!raw)
                return null;
            const d = JSON.parse(raw);
            if (!d || !Array.isArray(d.items) || Date.now() - d.at > CACHE_DAYS * 864e5)
                return null;
            return d.items;
        }
        catch {
            return null;
        }
    }
    function writeCache(p, items) {
        try {
            localStorage.setItem(cacheKey(p), JSON.stringify({ at: Date.now(), items }));
        }
        catch { /* too big or blocked: fine, just refetched next time */ }
    }
    async function fetchOverpass(p) {
        const d = p.radius / 110574, e = p.radius / (111320 * Math.cos((p.lat * Math.PI) / 180));
        const bbox = `${(p.lat - d).toFixed(5)},${(p.lon - e).toFixed(5)},${(p.lat + d).toFixed(5)},${(p.lon + e).toFixed(5)}`;
        const q = `[out:json][timeout:25];(way["building"](${bbox});way["highway"](${bbox});way["natural"~"^(water|wood|scrub)$"](${bbox});way["waterway"="riverbank"](${bbox});way["leisure"~"^(park|garden|pitch|playground)$"](${bbox});way["landuse"~"^(grass|forest|recreation_ground|meadow)$"](${bbox}););out tags geom;`;
        let lastErr = null;
        for (const url of ENDPOINTS) {
            const ctl = new AbortController();
            const t = setTimeout(() => ctl.abort(), 25000);
            try {
                const res = await fetch(url, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: ctl.signal });
                if (!res.ok)
                    throw new Error(`map server answered ${res.status}`);
                const json = await res.json();
                return compact(json.elements || []);
            }
            catch (err) {
                lastErr = err;
            }
            finally {
                clearTimeout(t);
            }
        }
        throw new Error(lastErr ? (lastErr.name === "AbortError" ? "map server took too long" : lastErr.message) : "map server unreachable");
    }
    // keep only what we draw, with short coordinates, so the cache stays small
    function compact(elements) {
        const out = [];
        for (const el of elements) {
            if (el.type !== "way" || !Array.isArray(el.geometry) || el.geometry.length < 2)
                continue;
            const t = el.tags || {};
            let k = null, v = null;
            if (t.building) {
                k = "b";
                v = { h: heightOf(t), c: t["building:colour"] || t["roof:colour"] || "" };
            }
            else if (t.highway) {
                k = "r";
                v = { c: t.highway };
            }
            else if (t.natural === "water" || t.waterway === "riverbank")
                k = "w";
            else if (t.leisure || t.landuse || t.natural)
                k = "g";
            if (!k)
                continue;
            out.push({ k, v, g: el.geometry.map((q) => [Math.round(q.lat * 1e6) / 1e6, Math.round(q.lon * 1e6) / 1e6]) });
        }
        return out;
    }
    function heightOf(t) {
        const h = parseFloat(t.height);
        if (Number.isFinite(h) && h > 0)
            return Math.min(h, 250);
        const lv = parseFloat(t["building:levels"]);
        if (Number.isFinite(lv) && lv > 0)
            return Math.min(lv, 60) * 3.2 + 1;
        return 0; // unknown: chosen per building below
    }
    const PALETTE = [0xd9d2c5, 0xcfc7b8, 0xe2dccf, 0xc9c1b4, 0xd6cdbd, 0xbfb8ac, 0xe6dfd2, 0xcdbfae];
    function hash(a, b) { let h = Math.floor(a * 1000) * 73856093 ^ Math.floor(b * 1000) * 19349663; h = (h ^ (h >>> 13)) >>> 0; return h; }
    function inside(pts, x, z) {
        let c = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
            if ((pts[i].z > z) !== (pts[j].z > z) && x < ((pts[j].x - pts[i].x) * (z - pts[i].z)) / (pts[j].z - pts[i].z) + pts[i].x)
                c = !c;
        return c;
    }
    function windowTexture(T) {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const x = c.getContext("2d");
        x.fillStyle = "#ffffff";
        x.fillRect(0, 0, 64, 64);
        x.fillStyle = "#6f8aa6";
        x.fillRect(14, 14, 36, 34);
        x.fillStyle = "#93aec7";
        x.fillRect(14, 14, 36, 10);
        x.fillStyle = "#e6e6e6";
        x.fillRect(12, 48, 40, 4);
        x.fillStyle = "#9a9a9a";
        x.fillRect(31, 14, 2, 34);
        const t = new T.CanvasTexture(c);
        t.wrapS = t.wrapT = T.RepeatWrapping;
        t.anisotropy = 4;
        return t;
    }
    // ---- real 3D models (Kenney, CC0): see server/simulation/assets/world/CREDITS.md. A missing file keeps the built-in shape. ----
    const KIT_URL = "../assets/world/", KIT_SIZE = { car: 4.2, person: 1.75, tree: 7, lamp: 6.2, house: 0 }; // longest side / height in metres (house: sized per building)
    const KIT_FILES = {
        car: ["racing/car-red.glb", "racing/car-green.glb", "racing/car-yellow.glb", "racing/car-purple.glb"],
        tree: ["tree.glb"], lamp: ["lamp.glb"], person: ["person.glb"],
        house: ["house-a.glb", "house-b.glb", "house-c.glb", "house-d.glb"],
    };
    const kit = {}; // name -> list of ready-to-clone models
    const pickKit = (name, i) => (kit[name] && kit[name].length ? kit[name][Math.abs(i) % kit[name].length].clone() : null);
    async function loadKit(T) {
        if (!T.GLTFLoader || kit.__done)
            return;
        const one = (name, file) => new Promise((resolve) => {
            new T.GLTFLoader().load(`${KIT_URL}${file}`, (gltf) => {
                const o = gltf.scene;
                o.traverse((m) => {
                    if (!m.isMesh)
                        return;
                    const old = m.material, map = old.map;
                    if (map) {
                        map.minFilter = map.magFilter = T.NearestFilter;
                        map.generateMipmaps = false;
                    }
                    m.material = new T.MeshLambertMaterial({ map, color: 0xffffff });
                });
                const box = new T.Box3().setFromObject(o), d = box.getSize(new T.Vector3());
                if (KIT_SIZE[name]) {
                    const k = KIT_SIZE[name] / (name === "car" ? Math.max(d.x, d.z) : d.y || 1);
                    o.scale.setScalar(k);
                    box.setFromObject(o);
                    o.position.y -= box.min.y;
                }
                const wrap = new T.Group();
                wrap.add(o);
                resolve(wrap);
            }, undefined, () => resolve(null));
        });
        await Promise.all(Object.keys(KIT_FILES).map(async (name) => {
            const got = (await Promise.all(KIT_FILES[name].map((f) => one(name, f)))).filter(Boolean);
            if (got.length)
                kit[name] = got;
        }));
        kit.__done = true;
    }
    function carShape(T, color) {
        const g = new T.Group(), m = (c) => new T.MeshLambertMaterial({ color: c });
        const body = new T.Mesh(new T.BoxGeometry(1.8, 0.7, 4.2), m(color));
        body.position.y = 0.7;
        g.add(body);
        const cab = new T.Mesh(new T.BoxGeometry(1.6, 0.6, 2.2), m(0x9fb4c8));
        cab.position.set(0, 1.3, -0.2);
        g.add(cab);
        for (const [x, z] of [[-0.9, 1.35], [0.9, 1.35], [-0.9, -1.35], [0.9, -1.35]]) {
            const w = new T.Mesh(new T.CylinderGeometry(0.38, 0.38, 0.3, 12).rotateZ(Math.PI / 2), m(0x222222));
            w.position.set(x, 0.38, z);
            g.add(w);
        }
        return g;
    }
    function personShape(T, color) {
        const g = new T.Group(), m = (c) => new T.MeshLambertMaterial({ color: c });
        const legs = new T.Mesh(new T.CylinderGeometry(0.17, 0.15, 0.85, 8), m(0x3b4252));
        legs.position.y = 0.42;
        g.add(legs);
        const body = new T.Mesh(new T.CylinderGeometry(0.24, 0.2, 0.65, 8), m(color));
        body.position.y = 1.2;
        g.add(body);
        const head = new T.Mesh(new T.SphereGeometry(0.15, 10, 8), m(0xe0b894));
        head.position.y = 1.65;
        g.add(head);
        return g;
    }
    const CAR_COLORS = [0xc0392b, 0x2c6fbb, 0xe7e7e7, 0x2b2b2b, 0xd9a31c, 0x3a8d5b, 0x8a8f98], PERSON_COLORS = [0xd9534f, 0x4a90d9, 0x5cb85c, 0xf0ad4e, 0x9b59b6, 0x34495e];
    const agents = [];
    let raf = 0, last = 0;
    function pathInfo(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++)
        cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z)); return { pts, cum, len: cum[cum.length - 1] }; }
    function at(path, s) {
        const { pts, cum } = path;
        let i = 1;
        while (i < cum.length - 1 && cum[i] < s)
            i++;
        const a = pts[i - 1], b = pts[i], seg = Math.max(0.001, cum[i] - cum[i - 1]), t = Math.min(1, Math.max(0, (s - cum[i - 1]) / seg));
        const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
        return { x: a.x + dx * t, z: a.z + dz * t, ux: dx / l, uz: dz / l };
    }
    function tick(now) {
        raf = requestAnimationFrame(tick);
        const dt = Math.min(0.1, (now - last) / 1000 || 0);
        last = now;
        if (!group || !group.visible)
            return;
        for (const a of agents) {
            a.s += a.dir * a.speed * dt;
            if (a.s > a.path.len) {
                a.s = a.path.len;
                a.dir = -1;
            }
            else if (a.s < 0) {
                a.s = 0;
                a.dir = 1;
            }
            const p = at(a.path, a.s), ux = p.ux * a.dir, uz = p.uz * a.dir, off = a.dir > 0 ? a.lane : -a.lane;
            a.obj.position.set(p.x - uz * off, 0, p.z + ux * off);
            a.obj.rotation.y = Math.atan2(ux, uz);
            if (a.walk)
                a.obj.position.y = Math.abs(Math.sin(a.s * 3.1)) * 0.05; // little bounce while walking
        }
    }
    function build(items, p) {
        const T = THREE_, to = project(p), g = new T.Group();
        g.name = "realWorld";
        const mat = (c, o = {}) => new T.MeshBasicMaterial(Object.assign({ color: c, side: T.DoubleSide }, o));
        // base ground: a calm paving colour that reads as "street level"
        const base = new T.Mesh(new T.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), mat(0xb9bbb4, { depthWrite: false }));
        base.position.y = -0.03;
        base.renderOrder = -4;
        g.add(base);
        const flat = (pts, color, y, order) => {
            if (pts.length < 3)
                return;
            const s = new T.Shape(pts.map((q) => new T.Vector2(q.x, -q.z)));
            const m = new T.Mesh(new T.ShapeGeometry(s).rotateX(-Math.PI / 2), mat(color, { depthWrite: false }));
            m.position.y = y;
            m.renderOrder = order;
            g.add(m);
        };
        let nb = 0, nr = 0, nHouses = 0;
        const roadPos = [], roadCol = [];
        const roadMats = [];
        for (const it of items) {
            const pts = it.g.map((q) => to(q[0], q[1]));
            if (it.k === "g")
                flat(pts, 0xa9c79b, -0.02, -3);
            else if (it.k === "w")
                flat(pts, 0x8fb7d8, -0.015, -3);
        }
        // roads: one flat ribbon per segment, merged into a single mesh
        for (const it of items) {
            if (it.k !== "r" || nr >= MAX_ROADS)
                continue;
            const w = ROAD_WIDTH[it.v.c] || 5, small = w < 3, col = new T.Color(small ? 0xd7d3c8 : 0x6f7378);
            const pts = it.g.map((q) => to(q[0], q[1]));
            nr++;
            for (let i = 0; i + 1 < pts.length; i++) {
                const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
                if (len < 0.01)
                    continue;
                const nx = (-dz / len) * (w / 2), nz = (dx / len) * (w / 2), y = small ? 0.012 : 0.01;
                const q = [[a.x + nx, a.z + nz], [a.x - nx, a.z - nz], [b.x - nx, b.z - nz], [b.x + nx, b.z + nz]];
                for (const idx of [0, 1, 2, 0, 2, 3]) {
                    roadPos.push(q[idx][0], y, q[idx][1]);
                    roadCol.push(col.r, col.g, col.b);
                }
            }
        }
        if (roadPos.length) {
            const geo = new T.BufferGeometry();
            geo.setAttribute("position", new T.Float32BufferAttribute(roadPos, 3));
            geo.setAttribute("color", new T.Float32BufferAttribute(roadCol, 3));
            const m = new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide, depthWrite: false }));
            m.renderOrder = -2;
            g.add(m);
        }
        // pavements (kerb strips) and dashed centre lines on the wider roads
        const kerbPos = [], dashPos = [];
        for (const it of items) {
            if (it.k !== "r")
                continue;
            const w = ROAD_WIDTH[it.v.c] || 5;
            if (w < 5)
                continue;
            const pts = it.g.map((q) => to(q[0], q[1]));
            for (let i = 0; i + 1 < pts.length; i++) {
                const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
                if (len < 0.5)
                    continue;
                const ux = dx / len, uz = dz / len, nx = -uz, nz = ux, hw = w / 2;
                const strip = (o1, o2, y, arr, t0 = 0, t1 = len) => {
                    const p = (o, t) => [a.x + ux * t + nx * o, y, a.z + uz * t + nz * o];
                    const A = p(o1, t0), B = p(o2, t0), C = p(o2, t1), D = p(o1, t1);
                    for (const v of [A, B, C, A, C, D])
                        arr.push(...v);
                };
                strip(hw, hw + 2.2, 0.006, kerbPos);
                strip(-hw - 2.2, -hw, 0.006, kerbPos);
                if (w >= 8)
                    for (let t = 1; t + 2 < len; t += 6)
                        strip(-0.12, 0.12, 0.014, dashPos, t, t + 2.8);
            }
        }
        const flatMesh = (pos, color, order) => {
            if (!pos.length)
                return;
            const geo = new T.BufferGeometry();
            geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
            const m = new T.Mesh(geo, mat(color, { depthWrite: false }));
            m.renderOrder = order;
            g.add(m);
        };
        flatMesh(kerbPos, 0xcfcac0, -3.5);
        flatMesh(dashPos, 0xf1efe6, -1.5);
        // buildings: own walls (so windows tile at a real size), a flat roof with a rim, colour per building
        const winTex = windowTexture(T);
        const wallMats = PALETTE.map((c) => new T.MeshLambertMaterial({ color: c, map: winTex }));
        const roofMat = new T.MeshLambertMaterial({ color: 0x8d8a85 });
        for (const it of items) {
            if (it.k !== "b" || nb >= MAX_BUILDINGS)
                continue;
            const pts = it.g.map((q) => to(q[0], q[1]));
            if (pts.length > 1 && pts[0].x === pts[pts.length - 1].x && pts[0].z === pts[pts.length - 1].z)
                pts.pop();
            if (pts.length < 3)
                continue;
            let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
            for (const q of pts) {
                minX = Math.min(minX, q.x);
                maxX = Math.max(maxX, q.x);
                minZ = Math.min(minZ, q.z);
                maxZ = Math.max(maxZ, q.z);
            }
            if (minX < 9 && maxX > -9 && minZ < 9 && maxZ > -9)
                continue; // keep a clear spot where the robot stands
            const hs = hash(it.g[0][0], it.g[0][1]);
            const h = it.v.h || 6 + (hs % 1000) / 1000 * 14, floors = Math.max(1, Math.round(h / 3.2));
            if (kit.house && pts.length <= 12) { // small, boxy buildings become real house models, stretched to the footprint
                let ea = 0, eb = 0, best = 0;
                for (let k = 0; k < pts.length; k++) {
                    const a = pts[k], b = pts[(k + 1) % pts.length], l = Math.hypot(b.x - a.x, b.z - a.z);
                    if (l > best) {
                        best = l;
                        ea = (b.x - a.x) / l;
                        eb = (b.z - a.z) / l;
                    }
                }
                let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9, area = 0;
                for (let k = 0; k < pts.length; k++) {
                    const q = pts[k], r = pts[(k + 1) % pts.length], u = q.x * ea + q.z * eb, v = -q.x * eb + q.z * ea;
                    u0 = Math.min(u0, u);
                    u1 = Math.max(u1, u);
                    v0 = Math.min(v0, v);
                    v1 = Math.max(v1, v);
                    area += q.x * r.z - r.x * q.z;
                }
                const w = u1 - u0, d = v1 - v0, fill = Math.abs(area / 2) / Math.max(1, w * d);
                if (w * d >= 40 && w * d <= 500 && w >= 4 && d >= 4 && fill > 0.8 && h <= 13) {
                    const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2, hm = pickKit("house", hs);
                    if (hm) {
                        hm.position.set(uc * ea - vc * eb, 0, uc * eb + vc * ea);
                        hm.rotation.y = Math.atan2(-eb, ea);
                        hm.scale.set(w, Math.max(h, 4) / 0.95, d);
                        g.add(hm);
                        nb++;
                        nHouses++;
                        continue;
                    }
                }
            }
            const pos = [], uv = [];
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i], b = pts[(i + 1) % pts.length], len = Math.hypot(b.x - a.x, b.z - a.z);
                if (len < 0.2)
                    continue;
                const cols = Math.max(1, Math.round(len / 3.2));
                pos.push(a.x, 0, a.z, b.x, 0, b.z, b.x, h, b.z, a.x, 0, a.z, b.x, h, b.z, a.x, h, a.z);
                uv.push(0, 0, cols, 0, cols, floors, 0, 0, cols, floors, 0, floors);
            }
            if (!pos.length)
                continue;
            const wall = new T.BufferGeometry();
            wall.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
            wall.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
            wall.computeVertexNormals();
            const wm = new T.Mesh(wall, wallMats[hs % wallMats.length]);
            wm.material.side = T.DoubleSide;
            g.add(wm);
            const roof = new T.Mesh(new T.ShapeGeometry(new T.Shape(pts.map((q) => new T.Vector2(q.x, -q.z)))).rotateX(-Math.PI / 2), roofMat);
            roof.position.y = h + 0.02;
            g.add(roof);
            nb++;
        }
        // trees: scattered inside parks / wooded areas (one shared tree shape, many copies)
        const treeSpots = [];
        for (const it of items) {
            if (it.k !== "g" || treeSpots.length >= 400)
                continue;
            const pts = it.g.map((q) => to(q[0], q[1]));
            if (pts.length < 4)
                continue;
            let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
            for (const q of pts) {
                minX = Math.min(minX, q.x);
                maxX = Math.max(maxX, q.x);
                minZ = Math.min(minZ, q.z);
                maxZ = Math.max(maxZ, q.z);
            }
            const area = (maxX - minX) * (maxZ - minZ), want = Math.min(60, Math.floor(area / (kit.tree ? 260 : 160)));
            let seed = hash(it.g[0][0], it.g[0][1]) || 1;
            const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
            for (let n = 0, tries = 0; n < want && tries < want * 6; tries++) {
                const x = minX + rnd() * (maxX - minX), z = minZ + rnd() * (maxZ - minZ);
                if (Math.abs(x) < 9 && Math.abs(z) < 9)
                    continue;
                if (inside(pts, x, z)) {
                    treeSpots.push([x, z, 0.8 + rnd() * 0.7]);
                    n++;
                }
            }
        }
        if (treeSpots.length && kit.tree) {
            treeSpots.slice(0, 250).forEach(([x, z, sc]) => { const t = pickKit("tree", Math.floor(x)); t.position.set(x, 0, z); t.scale.setScalar(sc); t.rotation.y = x * 7.3; g.add(t); });
        }
        else if (treeSpots.length) {
            const trunk = new T.CylinderGeometry(0.18, 0.25, 2.2, 6).translate(0, 1.1, 0), crown = new T.IcosahedronGeometry(1.7, 1).translate(0, 3.6, 0);
            const tm = new T.InstancedMesh(trunk, new T.MeshLambertMaterial({ color: 0x6b4f3a }), treeSpots.length);
            const cm = new T.InstancedMesh(crown, new T.MeshLambertMaterial({ color: 0x5f9a4d }), treeSpots.length);
            const mx = new T.Matrix4();
            treeSpots.forEach(([x, z, sc], i) => { mx.makeScale(sc, sc, sc).setPosition(x, 0, z); tm.setMatrixAt(i, mx); cm.setMatrixAt(i, mx); });
            g.add(tm, cm);
        }
        // street lamps along the bigger roads
        const lampSpots = [];
        for (const it of items) {
            if (it.k !== "r" || (ROAD_WIDTH[it.v.c] || 5) < 8)
                continue;
            const pts = it.g.map((q) => to(q[0], q[1]));
            let acc = 0;
            for (let i = 0; i + 1 < pts.length && lampSpots.length < 300; i++) {
                const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.z - a.z);
                if (len < 1)
                    continue;
                for (let t = (-acc % 35 + 35) % 35; t < len; t += 35) {
                    const o = (ROAD_WIDTH[it.v.c] || 8) / 2 + 1.1;
                    lampSpots.push([a.x + (b.x - a.x) * t / len - (b.z - a.z) / len * o, a.z + (b.z - a.z) * t / len + (b.x - a.x) / len * o, Math.atan2((b.x - a.x) / len, (b.z - a.z) / len)]);
                }
                acc += len;
            }
        }
        if (lampSpots.length && kit.lamp) {
            lampSpots.forEach(([x, z, ang]) => { const l = pickKit("lamp", 0); l.position.set(x, 0, z); l.rotation.y = ang; g.add(l); });
        }
        else if (lampSpots.length) {
            const pole = new T.CylinderGeometry(0.06, 0.08, 6, 5).translate(0, 3, 0), head = new T.BoxGeometry(0.9, 0.12, 0.3).translate(0.4, 6.05, 0);
            const pm = new T.InstancedMesh(pole, new T.MeshLambertMaterial({ color: 0x4a4d52 }), lampSpots.length);
            const hm = new T.InstancedMesh(head, new T.MeshBasicMaterial({ color: 0xfff1c2 }), lampSpots.length);
            const mx = new T.Matrix4();
            lampSpots.forEach(([x, z], i) => { mx.makeTranslation(x, 0, z); pm.setMatrixAt(i, mx); hm.setMatrixAt(i, mx); });
            g.add(pm, hm);
        }
        // traffic and pedestrians that move along the real road lines
        agents.length = 0;
        const roads = items.filter((it) => it.k === "r" && it.g.length >= 2).map((it) => ({ w: ROAD_WIDTH[it.v.c] || 5, path: pathInfo(it.g.map((q) => to(q[0], q[1]))) })).filter((r) => r.path.len > 20);
        const drive = roads.filter((r) => r.w >= 6), walkOn = roads.filter((r) => r.w >= 1.4);
        let seed = 7;
        const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
        for (let i = 0; i < 14 && drive.length; i++) {
            const r = drive[Math.floor(rnd() * drive.length)], obj = pickKit("car", i) || carShape(T, CAR_COLORS[i % CAR_COLORS.length]);
            agents.push({ obj, path: r.path, s: rnd() * r.path.len, dir: rnd() < 0.5 ? 1 : -1, speed: 5 + rnd() * 5, lane: r.w / 4 });
            g.add(obj);
        }
        for (let i = 0; i < 16 && walkOn.length; i++) {
            const r = walkOn[Math.floor(rnd() * walkOn.length)], obj = pickKit("person", i) || personShape(T, PERSON_COLORS[i % PERSON_COLORS.length]);
            agents.push({ obj, walk: true, path: r.path, s: rnd() * r.path.len, dir: rnd() < 0.5 ? 1 : -1, speed: 1.1 + rnd() * 0.6, lane: r.w >= 5 ? r.w / 2 + 1.1 : 0.3 + rnd() * 0.4 });
            g.add(obj);
        }
        g.userData.counts = { buildings: nb, roads: nr, trees: treeSpots.length, lamps: lampSpots.length, cars: agents.filter((a) => !a.walk).length, people: agents.filter((a) => a.walk).length, houses: nHouses, realModels: Object.keys(kit).filter((k) => k !== "__done") };
        return g;
    }
    function setAttribution(on) {
        if (!attrEl) {
            attrEl = document.createElement("div");
            attrEl.textContent = "Map data © OpenStreetMap contributors";
            attrEl.style.cssText = "position:absolute;right:8px;bottom:6px;font:11px system-ui,sans-serif;color:#333;background:rgba(255,255,255,.7);padding:1px 6px;border-radius:6px;pointer-events:none;z-index:3";
            const host = document.querySelector(".stage-panel") || document.body;
            host.appendChild(attrEl);
        }
        attrEl.style.display = on ? "" : "none";
    }
    return {
        /** Give the world the three.js scene and a function that shows/hides the old black floor. */
        init(T, sc, groundToggle) { THREE_ = T; scene = sc; setGround = groundToggle || setGround; },
        get state() { return state; },
        get place() { return place || getPlace(); },
        /** Turn the real world on. Resolves {ok, note}; on any failure the black floor stays and ok is false. */
        async enable(fogColor) {
            if (!scene)
                return { ok: false, note: "3D view not ready" };
            if (group) {
                group.visible = true;
                setGround(false);
                this.applyFog(fogColor);
                setAttribution(true);
                state = "on";
                return { ok: true, note: place.name };
            }
            place = getPlace();
            state = "loading";
            try {
                let items = readCache(place), fromCache = !!items;
                if (!items) {
                    items = await fetchOverpass(place);
                    writeCache(place, items);
                }
                await loadKit(THREE_);
                group = build(items, place);
                scene.add(group);
                if (!raf)
                    raf = requestAnimationFrame(tick);
                setGround(false);
                this.applyFog(fogColor);
                setAttribution(true);
                state = "on";
                return { ok: true, note: place.name, fromCache, counts: group.userData.counts };
            }
            catch (err) {
                state = "off";
                setGround(true);
                return { ok: false, note: err.message || "could not load the map" };
            }
        },
        disable() {
            if (group)
                group.visible = false;
            if (scene)
                scene.fog = fogWas;
            setGround(true);
            setAttribution(false);
            state = "off";
        },
        /** Dim the map at night / in storms, following the sky colour (so it never glows in the dark). */
        shade(skyHex) {
            if (!group || !THREE_)
                return;
            const c = new THREE_.Color(skyHex), lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b, f = Math.min(1, 0.3 + lum * 1.2);
            group.traverse((o) => {
                const m = o.material;
                if (!m || !m.color)
                    return;
                if (!m.userData.base)
                    m.userData.base = m.color.clone();
                m.color.copy(m.userData.base).multiplyScalar(f);
            });
        },
        applyFog(color) {
            if (!scene || !THREE_)
                return;
            if (!scene.fog) {
                fogWas = scene.fog;
                scene.fog = new THREE_.Fog(color || 0xbfd3e6, 120, 650);
            }
        },
    };
})();
