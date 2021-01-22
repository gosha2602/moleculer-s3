"use strict";

const { ServiceBroker } = require("moleculer");
const MyService = require("../../src");

describe("Test MyService", () => {
	const broker = new ServiceBroker();
	const service = broker.createService(MyService);

	beforeAll(() => broker.start());
	afterAll(() => broker.stop());

	it("should be created", () => {
		expect(service).toBeDefined();
	});

	it("should return with 'Hello Anonymous'", () => {
		return broker.call("s3.listBuckets").then(res => {
			expect(res).toBeDefined();
		});
	});
	it("should return with 'Get Object ACL'", () => {
		return broker
			.call("s3.getObjectAcl", { bucketName: "pointprism", objectName: "test.jpg" })
			.then(res => {
				expect(res).toBeDefined();
			});
	});
	it("should return with 'Put Object ACL'", () => {
		return broker
			.call("s3.putObjectAcl", {
				bucketName: "pointprism",
				objectName: "test.jpg",
				acl: "public-read"
			})
			.then(res => {
				expect(res).toBeDefined();
			});
	});

	it("should return with 'Presigned Url putObject '", () => {
		return broker
			.call("s3.presignedPutObject", {
				bucketName: "pointprism",
				objectName: "super.jpg"
			})
			.then(res => {
				expect(res).toBeDefined();
			});
	});

	it("should return with 'Presigned Url getObject '", () => {
		return broker
			.call("s3.presignedGetObject", {
				bucketName: "pointprism",
				objectName: "test.jpg"
			})
			.then(res => {
				expect(res).toBeDefined();
			});
	});

	it("should return with 'listObjectsV2 '", () => {
		return broker
			.call("s3.listObjectsV2", {
				bucketName: "pointprism"
			})
			.then(res => {
				expect(res).toBeDefined();
			});
	});
});
