// export function testDecorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
//   console.log('In decorator');
//   console.log(target);
//   console.log(propertyKey);
//   console.log(descriptor);
// }
import  * as crypto  from 'crypto';
import { SavedObjectsCreateOptions } from "opensearch-dashboards/server";

// export function testArgDecorator(target: Object, propertyKey: string | symbol, parameterIndex: number) {
//   console.log('in param decorator');
//   console.log(target);
//   console.log(propertyKey);
//   console.log(parameterIndex);
// }

export function logDecorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  // keep a reference to the original function
  const originalValue = descriptor.value;

  // Replace the original function with a wrapper
  descriptor.value = function (...args: any[]) {
      console.log(`=> ${propertyKey}(${args.join(", ")})`);

      // Call the original function
      var result = originalValue.apply(this, args);

      console.log(`<= ${result}`);
      return result;
  }
}

export function encryptionDecorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalValue = descriptor.value;
  descriptor.value = function (...args: any[]) {
    // console.log(`=> ${propertyKey}(${args.join(", ")})`);
    
    const type: string = args[0];
    const attributes = args[1];
    const options: SavedObjectsCreateOptions = args[2];
    console.log(type);
    console.log(JSON.stringify(attributes));
    console.log(JSON.stringify(options));
    if (type === 'data-source' && attributes.endpoint.credentials) {
      console.log('type is data-source');
      const credentials = attributes.endpoint.credentials;
      const hashPassword = crypto.createHash('md5').update(credentials.password).digest('hex');
      credentials.password = hashPassword;
      console.log(hashPassword);
    }
    console.log(JSON.stringify(attributes));
    // Call the original function
    var result = originalValue.apply(this, args);

    console.log(`<= ${result}`);
    return result;
  }
}