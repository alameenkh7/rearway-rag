import { registerDecorator, ValidationOptions } from 'class-validator'

// Bare @IsUrl() doesn't enforce "must include a scheme" the way the legacy
// app's manual `new URL()` check did — this replicates that exact check.
export function IsValidWebsiteUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidWebsiteUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null || value === '') return true // optional field
          if (typeof value !== 'string') return false
          try {
            new URL(value)
            return true
          } catch {
            return false
          }
        },
        defaultMessage() {
          return 'websiteUrl must be a valid URL (include the scheme, e.g. https://)'
        },
      },
    })
  }
}
