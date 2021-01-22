const { MinioPingError, MinioInitializationError } = require("./errors");
const { isString, isUndefined } = require("ramda-adjunct");
const AWS = require("aws-sdk");

/**
 * Service mixin for managing files in a Minio S3 backend
 *
 * @name moleculer-minio
 * @module Service
 *
 * dependes
 * "minio": "^7.0.2",
 * "ramda": "0.26.1",
 *  "ramda-adjunct": "^2.10.0"
 */
module.exports = {
	// Service name
	name: "s3",

	// Default settings
	settings: {
		/** @type {String} The Hostname minio is running on and available at. Hostname or IP-Address */
		endPoint: "ams3.digitaloceanspaces.com",
		/** @type {Number} TCP/IP port number minio is listening on. Default value set to 80 for HTTP and 443 for HTTPs.*/
		port: 443,
		/** @type {Boolean?} If set to true, https is used instead of http. Default is true.*/
		useSSL: true,
		/** @type {String} The AccessKey to use when connecting to minio */
		accessKey: "J5H6INOIGGHRN63P4C32",
		/** @type {String} The SecretKey to use when connecting to minio */
		secretKey: "4a+Rx8DtsnLOXNZI04XuZeGLiWr/DopSSz2g94VdQV4",
		/** @type {String?} Set this value to override region cache*/
		region: undefined,
		/** @type {String?} Set this value to pass in a custom transport. (Optional)*/
		transport: undefined,
		/** @type {String?} Set this value to provide x-amz-security-token (AWS S3 specific). (Optional)*/
		sessionToken: undefined,
		/** @type {Number?} This service will perform a periodic healthcheck of Minio. Use this setting to configure the inverval in which the healthcheck is performed. Set to `0` to turn healthcheks of */
		minioHealthCheckInterval: 5000
	},

	methods: {
		/**
		 * Creates and returns a new Aws client
		 *
		 * @methods
		 *
		 * @returns {Client}
		 */
		createAwsClient() {
			const spacesEndpoint = new AWS.Endpoint(this.settings.endPoint);
			return new AWS.S3({
				endpoint: spacesEndpoint,
				accessKeyId: this.settings.accessKey,
				secretAccessKey: this.settings.secretKey
			});
		}
	},
	actions: {
		/**
		 * Lists all buckets.
		 *
		 * @actions
		 *
		 * @returns {PromiseLike<Bucket[]|Error>}
		 */
		listBuckets: {
			handler() {
				return this.client
					.listBuckets()
					.promise()
					.then(buckets => {
						return buckets & buckets["data"] ? buckets["data"] : [];
					});
			}
		},

		/**
		 * Lists all objects in a bucket.
		 *
		 * @actions
		 * @param {string} bucketName - Name of the bucket
		 * @param {string} prefix - The prefix of the objects that should be listed (optional, default '').
		 * @param {boolean} recursive - `true` indicates recursive style listing and false indicates directory style listing delimited by '/'. (optional, default `false`).
		 *
		 * @returns {PromiseLike<Object[]|Error>}
		 */
		listObjects: {
			params: {
				bucketName: { type: "string" },
				prefix: { type: "string", optional: true },
				recursive: { type: "boolean", optional: true }
			},
			handler(ctx) {
				return this.Promise.resolve(ctx.params).then(
					({ bucketName, prefix = "", recursive = false }) => {
						return new this.Promise((resolve, reject) => {
							try {
								const stream = this.client.listObjects(
									bucketName,
									prefix,
									recursive
								);
								const objects = [];
								stream.on("data", el => objects.push(el));
								stream.on("end", () => resolve(objects));
								stream.on("error", reject);
							} catch (e) {
								reject(e);
							}
						});
					}
				);
			}
		},
		/**
		 * Lists all objects in a bucket using S3 listing objects V2 API
		 *
		 * @actions
		 * @param {string} bucketName - Name of the bucket
		 * @param {string} prefix - The prefix of the objects that should be listed (optional, default '').
		 * @param {boolean} maxObjects - maxObjects.
		 * @param {string} startAfter - Specifies the object name to start after when listing objects in a bucket. (optional, default '').
		 *
		 * @returns {PromiseLike<Object[]|Error>}
		 */
		listObjectsV2: {
			params: {
				bucketName: { type: "string" },
				prefix: { type: "string", optional: true },
				maxObjects: { type: "number", convert: true, optional: true },
				startAfter: { type: "string", optional: true }
			},
			async handler(ctx) {
				const doParams = {
					Bucket: ctx.params.bucketName,
					StartAfter: ctx.params.startAfter,
					Prefix: ctx.params.prefix,
					MaxKeys: ctx.params.maxObjects
				};
				return await this.client
					.listObjectsV2(doParams)
					.promise()
					.then(result => {
						console.log(result);
						return result;
					});
			}
		},
		/**
		 * Lists partially uploaded objects in a bucket.
		 *
		 * @actions
		 * @param {string} bucketName - Name of the bucket
		 * @param {string} prefix - The prefix of the objects that should be listed (optional, default '').
		 * @param {boolean} recursive - `true` indicates recursive style listing and false indicates directory style listing delimited by '/'. (optional, default `false`).
		 *
		 * @returns {PromiseLike<Object[]|Error>}
		 */
		listIncompleteUploads: {
			params: {
				bucketName: { type: "string" },
				prefix: { type: "string", optional: true },
				recursive: { type: "boolean", optional: true }
			},
			handler(ctx) {
				return this.Promise.resolve(ctx.params).then(
					({ bucketName, prefix = "", recursive = false }) => {
						return new this.Promise((resolve, reject) => {
							try {
								const stream = this.client.listIncompleteUploads(
									bucketName,
									prefix,
									recursive
								);
								const objects = [];
								stream.on("data", el => objects.push(el));
								stream.on("end", () => resolve(objects));
								stream.on("error", reject);
							} catch (e) {
								reject(e);
							}
						});
					}
				);
			}
		},
		/**
		 * Downloads an object as a stream.
		 *
		 * @actions
		 * @param {string} bucketName - Name of the bucket
		 * @param {string} objectName - Name of the object.
		 *
		 * @returns {PromiseLike<ReadableStream|Error>}
		 */
		getObject: {
			params: {
				bucketName: { type: "string" },
				objectName: { type: "string" }
			},
			handler(ctx) {
				return this.client
					.getObject({
						Bucket: ctx.params.bucketName,
						Key: ctx.params.objectName
					})
					.promise();
			}
		},
		/**
		 * Returns the access control list (ACL) of an object
		 *
		 * @actions
		 * @param {string} bucketName - Name of the bucket
		 * @param {string} objectName - Name of the object.
		 *
		 * @returns {PromiseLike<ReadableStream|Error>}
		 */
		getObjectAcl: {
			params: {
				bucketName: { type: "string" },
				objectName: { type: "string" }
			},
			async handler(ctx) {
				return await this.client
					.getObjectAcl({
						Bucket: ctx.params.bucketName,
						Key: ctx.params.objectName
					})
					.promise();
				/*.then(result => {
						console.log(result);
						return result;
					});**/
			}
		},
		/**
		 * Set the access control list (ACL) of an object
		 *
		 * @actions
		 * @param {string} bucketName - Name of the bucket
		 * @param {string} objectName - Name of the object.
		 * @param {string} acl - operation.
		 *
		 * @returns {PromiseLike<ReadableStream|Error>}
		 */
		putObjectAcl: {
			params: {
				bucketName: { type: "string" },
				objectName: { type: "string" },
				acl: { type: "string" }
			},
			async handler(ctx) {
				return await this.client
					.putObjectAcl({
						Bucket: ctx.params.bucketName,
						Key: ctx.params.objectName,
						ACL: ctx.params.acl
					})
					.promise()
					.then(result => {
						console.log(result);
						return result;
					});
			}
		},
		/**
		 * Downloads the specified range bytes of an object as a stream.
		 *
		 * @actions
		 * @param {string} bucketName - Name of the bucket.
		 * @param {string} objectName - Name of the object.
		 * @param {number} offset - `offset` of the object from where the stream will start.
		 * @param {number} length - `length` of the object that will be read in the stream (optional, if not specified we read the rest of the file from the offset).
		 *
		 * @returns {PromiseLike<ReadableStream|Error>}
		 */
		getPartialObject: {
			params: {
				bucketName: { type: "string" },
				objectName: { type: "string" },
				offset: { type: "number" },
				length: { type: "number", optional: true }
			},
			handler(ctx) {
				return this.client.getPartialObject(
					ctx.params.bucketName,
					ctx.params.objectName,
					ctx.params.offset,
					ctx.params.length
				);
			}
		},
		/**
		 * Downloads and saves the object as a file in the local filesystem.
		 *
		 * @actions
		 * @param {string} bucketName - Name of the bucket.
		 * @param {string} objectName - Name of the object.
		 * @param {string} filePath - Path on the local filesystem to which the object data will be written.
		 *
		 * @returns {PromiseLike<undefined|Error>}
		 */
		fGetObject: {
			params: {
				bucketName: { type: "string" },
				objectName: { type: "string" },
				filePath: { type: "string" }
			},
			handler(ctx) {
				return this.client.fGetObject(
					ctx.params.bucketName,
					ctx.params.objectName,
					ctx.params.filePath
				);
			}
		},
		/**
		 * Uploads an object from a stream/Buffer.
		 *
		 * @actions
		 * @param {ReadableStream} params - Readable stream.
		 *
		 * @meta
		 * @param {string} bucketName - Name of the bucket.
		 * @param {string} objectName - Name of the object.
		 * @param {number} size - Size of the object (optional).
		 * @param {object} metaData - metaData of the object (optional).
		 *
		 * @returns {PromiseLike<undefined|Error>}
		 */
		putObject: {
			handler(ctx) {
				return this.Promise.resolve({
					stream: ctx.params,
					meta: ctx.meta
				}).then(({ stream, meta }) =>
					this.client.putObject(
						meta.bucketName,
						meta.objectName,
						stream,
						meta.size,
						meta.metaData
					)
				);
			}
		},
		/**
		 * Uploads contents from a file to objectName.
		 *
		 * @actions
		 * @param {string} bucketName - Name of the bucket.
		 * @param {string} objectName - Name of the object.
		 * @param {string} filePath - Path of the file to be uploaded.
		 * @param {object} metaData - metaData of the object (optional).
		 *
		 * @returns {PromiseLike<undefined|Error>}
		 */
		fPutObject: {
			params: {
				bucketName: { type: "string" },
				objectName: { type: "string" },
				filePath: { type: "string" },
				metaData: { type: "object", optional: true }
			},
			handler(ctx) {
				return this.client.fPutObject(
					ctx.params.bucketName,
					ctx.params.objectName,
					ctx.params.filePath,
					ctx.params.metaData
				);
			}
		},
		/**
		 * Copy a source object into a new object in the specified bucket.
		 *
		 * @actions
		 * @param {string} bucketName - Name of the bucket.
		 * @param {string} objectName - Name of the object.
		 * @param {string} sourceObject - Path of the file to be copied.
		 * @param {object} conditions - Conditions to be satisfied before allowing object copy.
		 * @param {object} metaData - metaData of the object (optional).
		 *
		 * @returns {PromiseLike<{etag: {string}, lastModified: {string}}|Error>}
		 */
		copyObject: {
			params: {
				bucketName: { type: "string" },
				objectName: { type: "string" },
				sourceObject: { type: "string" },
				conditions: {
					type: "object",
					properties: {
						modified: { type: "string", optional: true },
						unmodified: { type: "string", optional: true },
						matchETag: { type: "string", optional: true },
						matchETagExcept: { type: "string", optional: true }
					}
				}
			},
			handler(ctx) {
				return this.Promise.resolve(ctx.params).then(
					({ bucketName, objectName, sourceObject, conditions }) => {
						const _conditions = new Minio.CopyConditions();
						if (conditions.modified) {
							_conditions.setModified(new Date(conditions.modified));
						}
						if (conditions.unmodified) {
							_conditions.setUnmodified(new Date(conditions.unmodified));
						}
						if (conditions.matchETag) {
							_conditions.setMatchETag(conditions.matchETag);
						}
						if (conditions.matchETagExcept) {
							_conditions.setMatchETagExcept(conditions.matchETagExcept);
						}
						conditions = _conditions;
						return this.client.copyObject(
							bucketName,
							objectName,
							sourceObject,
							conditions
						);
					}
				);
			}
		},
		/**
		 * Gets metadata of an object.
		 *
		 * @actions
		 * @param {string} bucketName - Name of the bucket.
		 * @param {string} objectName - Name of the object.
		 *
		 * @returns {PromiseLike<{size: {number}, metaData: {object}, lastModified: {string}, etag: {string}}|Error>}
		 */
		statObject: {
			params: {
				bucketName: { type: "string" },
				objectName: { type: "string" }
			},
			handler(ctx) {
				return this.client.statObject(ctx.params.bucketName, ctx.params.objectName);
			}
		},
		/**
		 * Removes an Object
		 *
		 * @actions
		 * @param {string} bucketName - Name of the bucket.
		 * @param {string} objectName - Name of the object.
		 *
		 * @returns {PromiseLike<undefined|Error>}
		 */
		removeObject: {
			params: {
				bucketName: { type: "string" },
				objectName: { type: "string" }
			},
			handler(ctx) {
				return this.client.removeObject(ctx.params.bucketName, ctx.params.objectName);
			}
		},
		/**
		 * Removes a list of Objects
		 *
		 * @actions
		 * @param {string} bucketName - Name of the bucket.
		 * @param {string[]} objectNames - Names of the objects.
		 *
		 * @returns {PromiseLike<undefined|Error>}
		 */
		removeObjects: {
			params: {
				bucketName: { type: "string" },
				objectNames: { type: "array", items: "string" }
			},
			handler(ctx) {
				return this.client.removeObjects(ctx.params.bucketName, ctx.params.objectNames);
			}
		},
		/**
		 * Removes a partially uploaded object.
		 *
		 * @actions
		 * @param {string} bucketName - Name of the bucket.
		 * @param {string} objectName - Name of the object.
		 *
		 * @returns {PromiseLike<undefined|Error>}
		 */
		removeIncompleteUpload: {
			params: {
				bucketName: { type: "string" },
				objectName: { type: "string" }
			},
			handler(ctx) {
				return this.Promise.resolve(ctx.params).then(({ bucketName, objectName }) =>
					this.client.removeIncompleteUpload(bucketName, objectName)
				);
			}
		},
		/**
		 * Generates a presigned URL for the provided HTTP method, 'httpMethod'. Browsers/Mobile clients may point to this URL to directly download objects even if the bucket is private. This
		 * presigned URL can have an associated expiration time in seconds after which the URL is no longer valid. The default value is 7 days.
		 *
		 * @actions
		 * @param {string} httpMethod - The HTTP-Method (eg. `GET`).
		 * @param {string} bucketName - Name of the bucket.
		 * @param {string} objectName - Name of the object.
		 * @param {number} expires - Expiry time in seconds. Default value is 7 days. (optional)
		 * @param {object} reqParams - request parameters. (optional)
		 * @param {string} requestDate - An ISO date string, the url will be issued at. Default value is now. (optional)
		 * @returns {PromiseLike<String|Error>}
		 */
		presignedUrl: {
			params: {
				httpMethod: { type: "string" },
				bucketName: { type: "string" },
				objectName: { type: "string" },
				expires: { type: "number", integer: true, optional: true, convert: true },
				reqParams: { type: "object", optional: true, default: {} },
				requestDate: { type: "string", optional: true }
			},
			handler(ctx) {
				return this.Promise.resolve(ctx.params).then(
					({ httpMethod, bucketName, objectName, expires, reqParams, requestDate }) => {
						if (isString(requestDate)) {
							requestDate = new Date(requestDate);
						}

						return new this.Promise((resolve, reject) => {
							this.client.presignedUrl(
								httpMethod,
								bucketName,
								objectName,
								expires,
								reqParams,
								requestDate,
								(error, url) => {
									if (error) {
										reject(error);
									} else {
										resolve(url);
									}
								}
							);
						});
					}
				);
			}
		},
		/**
		 * Generates a presigned URL for HTTP GET operations. Browsers/Mobile clients may point to this URL to directly download objects even if the bucket is private. This presigned URL can have an
		 * associated expiration time in seconds after which the URL is no longer valid. The default value is 7 days.
		 *
		 * @actions
		 * @param {string} bucketName - Name of the bucket.
		 * @param {string} objectName - Name of the object.
		 * @param {number} expires - Expiry time in seconds. Default value is 7 days. (optional)
		 * @returns {PromiseLike<String|Error>}
		 */
		presignedGetObject: {
			params: {
				bucketName: { type: "string" },
				objectName: { type: "string" },
				expires: { type: "number", integer: true, optional: true }
			},
			async handler(ctx) {
				const doParams = {
					Bucket: ctx.params.bucketName,
					Key: ctx.params.objectName,
					Expires: ctx.params.expires
				};
				return await this.client.getSignedUrlPromise("getObject", doParams);
			}
		},
		/**
		 * Generates a presigned URL for HTTP PUT operations. Browsers/Mobile clients may point to this URL to upload objects directly to a bucket even if it is private. This presigned URL can have
		 * an associated expiration time in seconds after which the URL is no longer valid. The default value is 7 days.
		 *
		 * @actions
		 * @param {string} bucketName - Name of the bucket.
		 * @param {string} objectName - Name of the object.
		 * @param {number} expires - Expiry time in seconds. Default value is 7 days. (optional)
		 * @returns {PromiseLike<String|Error>}
		 */
		presignedPutObject: {
			params: {
				bucketName: { type: "string" },
				objectName: { type: "string" },
				expires: {
					type: "number",
					integer: true,
					optional: true,
					convert: true,
					default: 60 * 60 * 2
				}
			},
			async handler(ctx) {
				const doParams = {
					Bucket: ctx.params.bucketName,
					Key: ctx.params.objectName,
					Expires: ctx.params.expires
				};
				return await this.client.getSignedUrlPromise("putObject", doParams);
			}
		},
		/**
		 * Allows setting policy conditions to a presigned URL for POST operations. Policies such as bucket name to receive object uploads, key name prefixes,
		 * expiry policy may be set.
		 *
		 * @actions
		 * @param {object} policy - Policy object created by minioClient.newPostPolicy()
		 * @returns {PromiseLike<{postURL: {string}, formData: {object}}|Error>}
		 */
		presignedPostPolicy: {
			params: {
				policy: {
					type: "object",
					properties: {
						expires: { type: "string", optional: true },
						key: { type: "string", optional: true },
						keyStartsWith: { type: "string", optional: true },
						bucket: { type: "string", optional: true },
						contentType: { type: "string", optional: true },
						contentLengthRangeMin: {
							type: "number",
							integer: true,
							optional: true
						},
						contentLengthRangeMax: {
							type: "number",
							integer: true,
							optional: true
						}
					}
				}
			},
			handler(ctx) {
				return this.Promise.resolve(ctx.params).then(({ policy }) => {
					const _policy = this.client.newPostPolicy();
					if (policy.expires) {
						_policy.setExpires(new Date(policy.expires));
					}
					if (policy.key) {
						_policy.setKey(policy.key);
					}
					if (policy.keyStartsWith) {
						_policy.setKeyStartsWith(policy.keyStartsWith);
					}
					if (policy.bucket) {
						_policy.setBucket(policy.bucket);
					}
					if (policy.contentType) {
						_policy.setContentType(policy.contentType);
					}
					if (policy.contentLengthRangeMin && policy.contentLengthRangeMax) {
						_policy.setContentLengthRange(
							policy.contentLengthRangeMin,
							policy.contentLengthRangeMax
						);
					}
					return this.client.presignedPostPolicy(_policy);
				});
			}
		},
		getBucketPolicy: {
			params: {
				bucketName: { type: "string" }
			},
			async handler(ctx) {
				return await this.client.getBucketPolicy(ctx.params.bucketName);
			}
		}
	},

	/**
	 * Service created lifecycle event handler.
	 * Constructs a new minio client entity
	 */
	created() {
		this.client = this.createAwsClient();
	},
	/**
	 * Service started lifecycle event handler. Resolves when:
	 * * ping of S3 backend has been successful
	 * * a healthCheck has been registered, given minioHealthCheckInterval > 0
	 * @returns {PromiseLike<undefined|MinioInitializationError>}
	 */
	started() {
		/* istanbul ignore next */
		/*return this.Promise.resolve()
			.then(() => this.ping())
			.then(() => {
				this.settings.minioHealthCheckInterval
					? (this.healthCheckInterval = setInterval(
							() =>
								this.ping().catch(e =>
									this.logger.error("Minio backend can not be reached", e)
								),
							this.settings.minioHealthCheckInterval
					  ))
					: undefined;
				return undefined;
			})
			.catch(e => {
				throw new MinioInitializationError(e.message);
			});*/
	},
	/**
	 * Service stopped lifecycle event handler.
	 * Removes the healthCheckInterval
	 */
	stopped() {
		this.healthCheckInterval && clearInterval(this.healthCheckInterval);
	}
};
