/** Where things are in the town. Units: an avatar is ~3 tall, a floor 4.2. */
export const PITCH = 50; // road grid spacing
export const ROAD = 10; // asphalt width
export const WALK = 4; // sidewalk width
export const EDGE = ROAD / 2 + WALK; // 9: road centre to building line
export const GRID = 5; // road lines at k*PITCH for k in [-GRID, GRID]
export const PLAZA = 41; // plaza is |x|,|z| < PLAZA

export type V3 = [number, number, number];

// landmarks
export const FOUNTAIN: V3 = [0, 0, 0];
export const TOWER: V3 = [-30, 0, -30];
export const TOWER_H = 46;
export const SHOP: V3 = [-9, 0, 75]; // facade line of the shop, facing +x (main street)
export const SHOP_ROOF_Y = 0.3 + 5 + 2 * 4.2 + 0.7; // slab + shop floor + two floors + cornice
export const BUSSTOP: V3 = [7, 0, 176];
export const SIRENS: V3[] = [
  [-34, 0, 32],
  [7, 0, 120],
  [-35, 0, -143],
];
// suburban street for the bike scene: road along x at z = -150
export const SUBURB_Z = -150;
