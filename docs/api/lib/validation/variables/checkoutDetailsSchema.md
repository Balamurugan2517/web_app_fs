[**fashion-store**](../../../README.md)

***

[fashion-store](../../../README.md) / [lib/validation](../README.md) / checkoutDetailsSchema

# Variable: checkoutDetailsSchema

> `const` **checkoutDetailsSchema**: `ZodObject`\<\{ `city`: `ZodString`; `couponCode`: `ZodDefault`\<`ZodOptional`\<`ZodString`\>\>; `email`: `ZodPipe`\<`ZodString`, `ZodEmail`\>; `line1`: `ZodString`; `line2`: `ZodDefault`\<`ZodOptional`\<`ZodString`\>\>; `name`: `ZodString`; `optInEmail`: `ZodDefault`\<`ZodOptional`\<`ZodBoolean`\>\>; `optInSms`: `ZodDefault`\<`ZodOptional`\<`ZodBoolean`\>\>; `optInWhatsapp`: `ZodDefault`\<`ZodOptional`\<`ZodBoolean`\>\>; `paymentMethod`: `ZodEnum`\<\{ `COD`: `"COD"`; `PREPAID`: `"PREPAID"`; \}\>; `phone`: `ZodString`; `pincode`: `ZodString`; `state`: `ZodEnum`\<\{ `Andaman and Nicobar Islands`: `"Andaman and Nicobar Islands"`; `Andhra Pradesh`: `"Andhra Pradesh"`; `Arunachal Pradesh`: `"Arunachal Pradesh"`; `Assam`: `"Assam"`; `Bihar`: `"Bihar"`; `Chandigarh`: `"Chandigarh"`; `Chhattisgarh`: `"Chhattisgarh"`; `Dadra and Nagar Haveli and Daman and Diu`: `"Dadra and Nagar Haveli and Daman and Diu"`; `Delhi`: `"Delhi"`; `Goa`: `"Goa"`; `Gujarat`: `"Gujarat"`; `Haryana`: `"Haryana"`; `Himachal Pradesh`: `"Himachal Pradesh"`; `Jammu and Kashmir`: `"Jammu and Kashmir"`; `Jharkhand`: `"Jharkhand"`; `Karnataka`: `"Karnataka"`; `Kerala`: `"Kerala"`; `Ladakh`: `"Ladakh"`; `Lakshadweep`: `"Lakshadweep"`; `Madhya Pradesh`: `"Madhya Pradesh"`; `Maharashtra`: `"Maharashtra"`; `Manipur`: `"Manipur"`; `Meghalaya`: `"Meghalaya"`; `Mizoram`: `"Mizoram"`; `Nagaland`: `"Nagaland"`; `Odisha`: `"Odisha"`; `Puducherry`: `"Puducherry"`; `Punjab`: `"Punjab"`; `Rajasthan`: `"Rajasthan"`; `Sikkim`: `"Sikkim"`; `Tamil Nadu`: `"Tamil Nadu"`; `Telangana`: `"Telangana"`; `Tripura`: `"Tripura"`; `Uttar Pradesh`: `"Uttar Pradesh"`; `Uttarakhand`: `"Uttarakhand"`; `West Bengal`: `"West Bengal"`; \}\>; \}, `$strip`\>

Defined in: work/fashion-store/src/lib/validation.ts:24

The customer-facing form (no cart items).
