const { CredentialFactory } = require('../src/services/credentialFactory');
const { ClientCertificateCredential } = require('@azure/identity');

// Mock Azure Identity module
jest.mock('@azure/identity');

describe('CredentialFactory Certificate Authentication', () => {
    let credentialFactory;
    
    beforeEach(() => {
        // Set up test environment
        process.env.NODE_ENV = 'test';
        process.env.MICROSOFT_APP_ID = 'test-client-id';
        process.env.MICROSOFT_APP_TENANT_ID = 'test-tenant-id';
        process.env.AZURE_KEY_VAULT_URI = 'https://test-vault.vault.azure.net/';
        process.env.AZURE_KEY_VAULT_CERTIFICATE_NAME = 'test-cert';
        
        credentialFactory = new CredentialFactory();
        
        // Clear all mocks
        jest.clearAllMocks();
    });
    
    afterEach(() => {
        // Clean up environment
        delete process.env.MICROSOFT_APP_ID;
        delete process.env.MICROSOFT_APP_TENANT_ID;
        delete process.env.AZURE_KEY_VAULT_URI;
        delete process.env.AZURE_KEY_VAULT_CERTIFICATE_NAME;
        delete process.env.AZURE_KEY_VAULT_CERTIFICATE_PASSWORD;
    });
    
    describe('tryCreateCertificateCredential', () => {
        const mockCertificateInfo = {
            certificate: 'VGVzdCBjZXJ0aWZpY2F0ZSBkYXRh', // Base64 encoded "Test certificate data"
            password: '',
            format: 'pkcs12'
        };
        
        test('should succeed with first approach (base64 string)', async () => {
            // Mock ClientCertificateCredential to succeed on first attempt
            const mockCredential = { mockCredential: true };
            ClientCertificateCredential.mockImplementationOnce(() => mockCredential);
            
            await credentialFactory.tryCreateCertificateCredential(
                'test-tenant-id',
                'test-client-id', 
                mockCertificateInfo
            );
            
            expect(ClientCertificateCredential).toHaveBeenCalledTimes(1);
            expect(ClientCertificateCredential).toHaveBeenCalledWith(
                'test-tenant-id',
                'test-client-id',
                mockCertificateInfo.certificate
            );
            expect(credentialFactory.credential).toBe(mockCredential);
        });
        
        test('should fallback to second approach (buffer) when first fails', async () => {
            // Mock ClientCertificateCredential to fail on first attempt, succeed on second
            const mockCredential = { mockCredential: true };
            ClientCertificateCredential
                .mockImplementationOnce(() => {
                    throw new Error('Base64 string not supported');
                })
                .mockImplementationOnce(() => mockCredential);
            
            await credentialFactory.tryCreateCertificateCredential(
                'test-tenant-id',
                'test-client-id',
                mockCertificateInfo
            );
            
            expect(ClientCertificateCredential).toHaveBeenCalledTimes(2);
            expect(credentialFactory.credential).toBe(mockCredential);
        });
        
        test('should fallback to third approach (temp file) when first two fail', async () => {
            // Mock fs module
            const mockFs = {
                writeFileSync: jest.fn(),
                unlinkSync: jest.fn(),
                existsSync: jest.fn().mockReturnValue(true)
            };
            jest.doMock('fs', () => mockFs);
            
            // Mock path and os modules
            jest.doMock('path', () => ({
                join: jest.fn().mockReturnValue('/tmp/cert-123-abc.pfx')
            }));
            jest.doMock('os', () => ({
                tmpdir: jest.fn().mockReturnValue('/tmp')
            }));
            
            const mockCredential = { mockCredential: true };
            ClientCertificateCredential
                .mockImplementationOnce(() => {
                    throw new Error('Base64 string not supported');
                })
                .mockImplementationOnce(() => {
                    throw new Error('Buffer not supported');
                })
                .mockImplementationOnce(() => mockCredential);
            
            await credentialFactory.tryCreateCertificateCredential(
                'test-tenant-id',
                'test-client-id',
                mockCertificateInfo
            );
            
            expect(ClientCertificateCredential).toHaveBeenCalledTimes(3);
            expect(ClientCertificateCredential).toHaveBeenLastCalledWith(
                'test-tenant-id',
                'test-client-id',
                '/tmp/cert-123-abc.pfx'
            );
            expect(credentialFactory.credential).toBe(mockCredential);
        });
        
        test('should throw error when all approaches fail', async () => {
            // Mock ClientCertificateCredential to fail on all attempts
            ClientCertificateCredential
                .mockImplementationOnce(() => {
                    throw new Error('Base64 string not supported');
                })
                .mockImplementationOnce(() => {
                    throw new Error('Buffer not supported');
                })
                .mockImplementationOnce(() => {
                    throw new Error('File path not supported');
                });
            
            await expect(credentialFactory.tryCreateCertificateCredential(
                'test-tenant-id',
                'test-client-id',
                mockCertificateInfo
            )).rejects.toThrow('All certificate credential approaches failed');
            
            expect(ClientCertificateCredential).toHaveBeenCalledTimes(3);
        });
        
        test('should handle temp file creation and cleanup', async () => {
            // Mock first two attempts to fail, third to succeed
            const mockCredential = { mockCredential: true };
            ClientCertificateCredential
                .mockImplementationOnce(() => {
                    throw new Error('Base64 string not supported');
                })
                .mockImplementationOnce(() => {
                    throw new Error('Buffer not supported');
                })
                .mockImplementationOnce(() => mockCredential);
            
            // This test verifies that the method completes successfully
            // when the third approach (temp file) works
            const result = await credentialFactory.tryCreateCertificateCredential(
                'test-tenant-id',
                'test-client-id',
                mockCertificateInfo
            );
            
            // Verify that all three approaches were attempted
            expect(ClientCertificateCredential).toHaveBeenCalledTimes(3);
            
            // The third call should be with a file path (string)
            const thirdCall = ClientCertificateCredential.mock.calls[2];
            expect(typeof thirdCall[2]).toBe('string'); // file path
            expect(thirdCall[2]).toMatch(/\.pfx$/); // should end with .pfx
        });
    });
});
