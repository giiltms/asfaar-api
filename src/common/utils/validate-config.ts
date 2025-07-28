import { ClassConstructor, plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

export async function validateConfig<T extends object>(
  config: object,
  envVariablesClass: ClassConstructor<T>,
): Promise<T> {
  const validatedConfig = plainToClass(envVariablesClass, config, {
    enableImplicitConversion: true,
  });

  const errors = await validate(validatedConfig as object, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Config validation error: ${errors
        .map(error => Object.values(error.constraints || {}).join(', '))
        .join('; ')}`,
    );
  }

  return validatedConfig;
}

export { validateConfig as default }; 