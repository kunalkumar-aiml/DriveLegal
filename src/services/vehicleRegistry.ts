export type VehicleRecord = {
  registrationNumber: string;
  ownerName: string;
  vehicleClass: string;
  makeModel: string;
  fuelType: string;
  engineNumberMasked: string;
  chassisNumberMasked: string;
  registrationDate: string;
  rcValidUpto: string;
  insuranceValidUpto: string;
  puccValidUpto: string;
  roadTaxValidUpto: string;
  fitnessValidUpto: string;
  permitValidUpto?: string;
  pendingChallans: number;
};

const registryData: VehicleRecord[] = [
  {
    registrationNumber: 'TN05BH9417',
    ownerName: 'Arun Kumar',
    vehicleClass: 'MCWG - 2 Wheeler',
    makeModel: 'Bajaj Pulsar 150',
    fuelType: 'Petrol',
    engineNumberMasked: 'DHX2******7309',
    chassisNumberMasked: 'MD2A18AZ******4412',
    registrationDate: '21 Feb 2020',
    rcValidUpto: '20 Feb 2035',
    insuranceValidUpto: '14 Oct 2026',
    puccValidUpto: '30 Jul 2026',
    roadTaxValidUpto: '20 Feb 2035',
    fitnessValidUpto: '20 Feb 2035',
    pendingChallans: 0,
  },
  {
    registrationNumber: 'DL01AB1234',
    ownerName: 'Rajat Sharma',
    vehicleClass: 'LMV - Private Car',
    makeModel: 'Hyundai Creta',
    fuelType: 'Petrol',
    engineNumberMasked: 'G4FG******8127',
    chassisNumberMasked: 'MALPC81B******9124',
    registrationDate: '12 Apr 2021',
    rcValidUpto: '11 Apr 2036',
    insuranceValidUpto: '25 Dec 2026',
    puccValidUpto: '15 Jun 2026',
    roadTaxValidUpto: '11 Apr 2036',
    fitnessValidUpto: '11 Apr 2036',
    pendingChallans: 1,
  },
  {
    registrationNumber: 'MH12XY7788',
    ownerName: 'Savita Patil',
    vehicleClass: 'MCWG - 2 Wheeler',
    makeModel: 'TVS Apache RTR 160',
    fuelType: 'Petrol',
    engineNumberMasked: 'RT160******4552',
    chassisNumberMasked: 'MD634KE4******1623',
    registrationDate: '03 Sep 2022',
    rcValidUpto: '02 Sep 2037',
    insuranceValidUpto: '20 Sep 2026',
    puccValidUpto: '01 Jul 2026',
    roadTaxValidUpto: '02 Sep 2037',
    fitnessValidUpto: '02 Sep 2037',
    pendingChallans: 0,
  },
  {
    registrationNumber: 'KA03TR9921',
    ownerName: 'Shiv Logistics Pvt Ltd',
    vehicleClass: 'HGV - Goods Carrier',
    makeModel: 'Ashok Leyland 2820',
    fuelType: 'Diesel',
    engineNumberMasked: 'H6E2******7901',
    chassisNumberMasked: 'MB1K7H2A******3378',
    registrationDate: '18 Jan 2019',
    rcValidUpto: '17 Jan 2034',
    insuranceValidUpto: '05 Nov 2026',
    puccValidUpto: '30 May 2026',
    roadTaxValidUpto: '17 Jan 2034',
    fitnessValidUpto: '16 Jan 2027',
    permitValidUpto: '16 Jan 2027',
    pendingChallans: 3,
  },
];

export function normalizeRegistrationNumber(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function getAllLocalVehicleRecords() {
  return [...registryData];
}

export function lookupVehicleByNumber(registrationNumber: string): VehicleRecord | null {
  const normalized = normalizeRegistrationNumber(registrationNumber);

  const found = registryData.find(
    (record) => normalizeRegistrationNumber(record.registrationNumber) === normalized
  );

  return found ?? null;
}
