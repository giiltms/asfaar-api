import { AgicApplicantRecord } from '@modules/agic/agic-applicant';

/** The record AGIC returned for the sample slip, as of 29 Sep 2026. */
export const sampleAgicRecord = (): AgicApplicantRecord => ({
  appointmentNumber: 'AGIC-BIO-260929-62ACF5',
  application: {
    applicationId: 6211,
    applicationNumber: '2609202055595142',
    applicationStatus: 'Draft',
  },
  applicant: {
    applicantName: 'SALISU HAFSATU',
    dateOfBirth: '1995-12-30T00:00:00',
    age: '30 years',
    genderId: 2,
    gender: 'Female',
    nationalityId: 1,
    nationality: 'Nigeria',
    nin: '86463406817',
    email: 'Muhammadadamu9090@gmail.com',
    phoneNumber: '08032309762',
  },
  passport: {
    passportNumber: 'B02518467',
    dateOfIssue: '2024-01-26T00:00:00',
    dateOfExpiration: '2029-01-25T00:00:00',
  },
  visa: {
    visaCountryId: 1,
    visaCountry: 'Saudi Arabia',
    visaTypeId: 2,
    visaType: 'Family Visit',
    visaServiceId: 1,
    visaService: 'None',
  },
  photo: {
    hasPhoto: true,
    photoUrl: '/api/v1/biometrics/appointments/AGIC-BIO-260929-62ACF5/photo',
  },
  biometricAppointment: {
    appointmentNumber: 'AGIC-BIO-260929-62ACF5',
    status: 'Reserved',
    slotDate: '2026-10-06T00:00:00',
    startTime: '12:30',
    endTime: '13:00',
    bookedAt: '2026-09-29T00:12:45.11',
  },
  biometricCenter: {
    locationId: 1,
    locationName: 'ABUJA',
    centerId: 1,
    centerName: 'ASFAAR',
    address: '14 Yedseram Street, Maitama, Abuja, Nigeria.',
  },
});
