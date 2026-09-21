import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from '../../../filters/all-exception.filter';

/**
 * Errors raised below Nest - by express.static, body-parser, CORS - are plain
 * Errors carrying `status`/`statusCode`, not HttpExceptions, so they have no
 * getStatus(). Reporting all of them as 500 turned an ordinary missing upload
 * into "Internal server error", which is what made it hard to diagnose.
 */
const buildHost = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });

  return {
    host: {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'GET', url: '/uploads/a/b.png' }),
      }),
    } as any,
    status,
    json,
  };
};

/** An error as the http-errors package builds it, which serve-static uses. */
const httpError = (code: number, message: string, expose = code < 500) => {
  const error: any = new Error(message);
  error.status = code;
  error.statusCode = code;
  error.expose = expose;
  return error;
};

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('reports a missing static file as 404, not 500', () => {
    const { host, status, json } = buildHost();

    filter.catch(httpError(404, 'Not Found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 404000, message: 'Not Found' }),
      }),
    );
  });

  it('honours a payload-too-large error from the body parser', () => {
    const { host, status } = buildHost();

    filter.catch(httpError(413, 'request entity too large'), host);

    expect(status).toHaveBeenCalledWith(413);
  });

  it('still reports a genuine failure as 500', () => {
    const { host, status, json } = buildHost();

    filter.catch(new Error('something exploded'), host);

    expect(status).toHaveBeenCalledWith(500);
    // The underlying message is not leaked to the caller.
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Internal server error' }),
      }),
    );
  });

  it('does not leak the message of a server-side http error', () => {
    const { host, status, json } = buildHost();

    filter.catch(httpError(502, 'upstream pgbouncer refused', false), host);

    expect(status).toHaveBeenCalledWith(502);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Internal server error' }),
      }),
    );
  });

  it('ignores a nonsense status on an error object', () => {
    const { host, status } = buildHost();
    const error: any = new Error('odd');
    error.status = 'not-a-number';

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(500);
  });

  describe('existing behaviour is preserved', () => {
    it('uses the status of a Nest HttpException', () => {
      const { host, status, json } = buildHost();

      filter.catch(new NotFoundException('Applicant not found'), host);

      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 404000,
            message: 'Applicant not found',
          }),
        }),
      );
    });

    it('keeps a coded message as its own code', () => {
      const { host, json } = buildHost();

      filter.catch(new NotFoundException('404011: Applicant not found'), host);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 404011,
            message: 'Applicant not found',
          }),
        }),
      );
    });

    it('keeps every validation message in details', () => {
      const { host, json } = buildHost();

      filter.catch(
        new BadRequestException(['email must be an email', 'age must be int']),
        host,
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 400000,
            message: 'email must be an email, age must be int',
            details: ['email must be an email', 'age must be int'],
          }),
        }),
      );
    });
  });
});
