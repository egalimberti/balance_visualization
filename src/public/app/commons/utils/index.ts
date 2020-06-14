import { isEqual, isObject, transform } from 'lodash';

export function dataURItoBlob(dataURI): Blob {
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    const byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

    // write the bytes of the string to an ArrayBuffer
    const ab = new ArrayBuffer(byteString.length);

    // create a view into the buffer
    const ia = new Uint8Array(ab);

    // set the bytes of the buffer to the correct values
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    const blob = new Blob([ab], { type: mimeString });
    return blob;
}

/**
 * Deep diff between two object, using lodash
 * @param  object Object compared
 * @param  base   Object to compare with
 * @return Return a new object who represent the diff
 */
export function objsDifference(object: any, base: any): any {
    function changes(object: any, base: any) {
        return transform(object, function (result, value, key) {
            if (!isEqual(value, base[key])) {
                result[key] = (isObject(value) && isObject(base[key])) ? changes(value, base[key]) : { A: value, B: base[key] };
            }
        });
    }
    return changes(object, base);
}
