import * as fs from 'fs';
import * as path from 'path';
import {
  AgicPhotoService,
  photoFromDataUri,
} from '@modules/agic/agic-photo.service';
import { sampleAgicRecord } from './agic-fixtures';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const DATA_URI = `data:image/jpeg;base64,${JPEG.toString('base64')}`;
const FOLDER = path.join(process.cwd(), 'uploads', 'agic-photos');

function build({
  responses = [] as any[],
  metadata = { agicPhotoUsed: true } as any,
  avatar = DATA_URI,
} = {}) {
  const prisma: any = {
    formField: {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce({ id: 'f1', name: 'passport-photo' }),
    },
    formSubmission: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        formId: 'form-1',
        metadata,
        user: { avatar },
        responses,
      }),
    },
    fieldResponse: { upsert: jest.fn().mockResolvedValue({}) },
  };
  const agic: any = {
    getPhoto: jest
      .fn()
      .mockResolvedValue({ mimeType: 'image/jpeg', data: JPEG }),
  };
  return { service: new AgicPhotoService(prisma, agic), prisma, agic };
}

describe('AgicPhotoService', () => {
  const written: string[] = [];
  afterAll(() => written.forEach((f) => fs.rmSync(f, { force: true })));
  const track = (fileUrl: string) => {
    written.push(path.join(process.cwd(), fileUrl));
    return fileUrl;
  };

  it('saves the photo as a file under /uploads, named by appointment and content', async () => {
    const { service } = build();
    const a = await service.store('AGIC-BIO-1', {
      mimeType: 'image/jpeg',
      data: JPEG,
    });
    const b = await service.store('AGIC-BIO-1', {
      mimeType: 'image/jpeg',
      data: JPEG,
    });
    track(a.fileUrl);
    expect(a.fileUrl).toMatch(
      /^\/uploads\/agic-photos\/AGIC-BIO-1-[0-9a-f]{16}\.jpg$/,
    );
    expect(b.fileUrl).toBe(a.fileUrl);
    expect(
      fs.readFileSync(path.join(process.cwd(), a.fileUrl)).equals(JPEG),
    ).toBe(true);
    expect(a.dataUri).toBe(DATA_URI);
  });

  it('keeps path characters out of the file name', async () => {
    const { service } = build();
    const stored = await service.store('../../etc/AGIC', {
      mimeType: 'image/png',
      data: JPEG,
    });
    track(stored.fileUrl);
    expect(path.dirname(path.join(process.cwd(), stored.fileUrl))).toBe(FOLDER);
  });

  it('files the answer under the passport-photo field once', async () => {
    const { service, prisma } = build();
    await service.fileAsAnswer(
      prisma,
      'sub-1',
      { id: 'f1', name: 'passport-photo' },
      '/uploads/x.jpg',
    );
    const call = prisma.fieldResponse.upsert.mock.calls[0][0];
    expect(call.update).toEqual({});
    expect(call.create).toMatchObject({
      submissionId: 'sub-1',
      fieldId: 'f1',
      fieldName: 'passport-photo',
      fileUrls: ['/uploads/x.jpg'],
    });
  });

  it('repairs an application from the AGIC avatar without calling AGIC', async () => {
    const { service, prisma, agic } = build();
    await expect(
      service.ensureOnFile('sub-1', sampleAgicRecord()),
    ).resolves.toBeNull();
    expect(agic.getPhoto).not.toHaveBeenCalled();
    const { fileUrls } = prisma.fieldResponse.upsert.mock.calls[0][0].create;
    track(fileUrls[0]);
    expect(
      fs.readFileSync(path.join(process.cwd(), fileUrls[0])).equals(JPEG),
    ).toBe(true);
  });

  it("downloads from AGIC when the avatar is the person's own", async () => {
    const { service, prisma, agic } = build({
      metadata: { agicPhotoUsed: false },
      avatar: 'https://cdn/own.png',
    });
    await service.ensureOnFile('sub-1', sampleAgicRecord());
    expect(agic.getPhoto).toHaveBeenCalled();
    track(prisma.fieldResponse.upsert.mock.calls[0][0].create.fileUrls[0]);
  });

  it('leaves an application that already has its photo answer alone', async () => {
    const { service, prisma, agic } = build({ responses: [{ fieldId: 'f1' }] });
    await service.ensureOnFile('sub-1', sampleAgicRecord());
    expect(prisma.fieldResponse.upsert).not.toHaveBeenCalled();
    expect(agic.getPhoto).not.toHaveBeenCalled();
  });

  it('reports rather than throws when the photo cannot be had', async () => {
    const { service, agic } = build({ metadata: {}, avatar: '' });
    agic.getPhoto.mockRejectedValue(new Error('AGIC down'));
    await expect(
      service.ensureOnFile('sub-1', sampleAgicRecord()),
    ).resolves.toMatch(/could not be saved/);
  });

  it('says so when the form has no photo field', async () => {
    const { service, prisma } = build();
    prisma.formField.findFirst = jest.fn().mockResolvedValue(null);
    await expect(
      service.ensureOnFile('sub-1', sampleAgicRecord()),
    ).resolves.toMatch(/no passport-photo field/);
  });
});

describe('photoFromDataUri', () => {
  it('reads an image data URI back into bytes', () => {
    expect(photoFromDataUri(DATA_URI)).toEqual({
      mimeType: 'image/jpeg',
      data: JPEG,
    });
  });
  it('ignores anything that is not one', () => {
    expect(photoFromDataUri('/uploads/a.jpg')).toBeNull();
    expect(photoFromDataUri('data:text/html;base64,PGh0bWw+')).toBeNull();
    expect(photoFromDataUri(null)).toBeNull();
  });
});

describe('AgicPhotoService.repairMissing', () => {
  it('files the photo for every import without it, and reports what it could not', async () => {
    const { service, prisma } = build();
    prisma.agicImport = {
      findMany: jest.fn().mockResolvedValue([
        {
          appointmentNumber: 'AGIC-BIO-A',
          submissionId: 'sub-a',
          agicData: sampleAgicRecord(),
        },
        {
          appointmentNumber: 'AGIC-BIO-B',
          submissionId: 'sub-b',
          agicData: sampleAgicRecord(),
        },
      ]),
    };
    const ensure = jest
      .spyOn(service, 'ensureOnFile')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('no field');

    await expect(service.repairMissing()).resolves.toEqual({
      checked: 2,
      unresolved: ['AGIC-BIO-B: no field'],
    });
    expect(ensure).toHaveBeenCalledWith('sub-a', expect.anything());
    expect(prisma.agicImport.findMany.mock.calls[0][0].where).toEqual({
      submission: { responses: { none: { fieldName: 'passport-photo' } } },
    });
  });
});
