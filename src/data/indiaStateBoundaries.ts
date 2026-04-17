export type IndiaStateBoundary = {
  code: string;
  name: string;
  polygon: Array<[number, number]>;
};

export const indiaStateBoundaries: IndiaStateBoundary[] = [
  {
    code: 'MH',
    name: 'Maharashtra',
    polygon: [
      [72.6, 15.6],
      [80.9, 15.6],
      [80.9, 22.2],
      [72.6, 22.2],
      [72.6, 15.6],
    ],
  },
  {
    code: 'GJ',
    name: 'Gujarat',
    polygon: [
      [68.0, 20.0],
      [74.8, 20.0],
      [74.8, 24.8],
      [68.0, 24.8],
      [68.0, 20.0],
    ],
  },
  {
    code: 'RJ',
    name: 'Rajasthan',
    polygon: [
      [69.3, 23.0],
      [78.4, 23.0],
      [78.4, 30.2],
      [69.3, 30.2],
      [69.3, 23.0],
    ],
  },
  {
    code: 'KA',
    name: 'Karnataka',
    polygon: [
      [74.0, 11.5],
      [78.8, 11.5],
      [78.8, 18.6],
      [74.0, 18.6],
      [74.0, 11.5],
    ],
  },
  {
    code: 'TN',
    name: 'Tamil Nadu',
    polygon: [
      [76.0, 8.0],
      [80.5, 8.0],
      [80.5, 13.8],
      [76.0, 13.8],
      [76.0, 8.0],
    ],
  },
  {
    code: 'UP',
    name: 'Uttar Pradesh',
    polygon: [
      [77.0, 23.8],
      [84.8, 23.8],
      [84.8, 30.6],
      [77.0, 30.6],
      [77.0, 23.8],
    ],
  },
  {
    code: 'WB',
    name: 'West Bengal',
    polygon: [
      [85.7, 21.5],
      [89.9, 21.5],
      [89.9, 27.3],
      [85.7, 27.3],
      [85.7, 21.5],
    ],
  },
  {
    code: 'DL',
    name: 'Delhi',
    polygon: [
      [76.8, 28.3],
      [77.4, 28.3],
      [77.4, 28.95],
      [76.8, 28.95],
      [76.8, 28.3],
    ],
  },
  {
    code: 'TS',
    name: 'Telangana',
    polygon: [
      [77.1, 15.7],
      [81.1, 15.7],
      [81.1, 19.9],
      [77.1, 19.9],
      [77.1, 15.7],
    ],
  },
  {
    code: 'AP',
    name: 'Andhra Pradesh',
    polygon: [
      [78.0, 12.6],
      [84.9, 12.6],
      [84.9, 19.3],
      [78.0, 19.3],
      [78.0, 12.6],
    ],
  },
];
