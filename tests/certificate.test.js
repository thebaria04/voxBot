const CertificateManager = require('../deployment/create-certificate');

describe('Certificate Manager', () => {
    let certificateManager;
    
    beforeEach(() => {
        // Mock environment for tests
        process.env.NODE_ENV = 'test';
        process.env.AZURE_KEY_VAULT_URI = 'https://test-kv.vault.azure.net/';
        process.env.AZURE_KEY_VAULT_CERTIFICATE_NAME = 'test-cert';
        
        certificateManager = new CertificateManager();
    });
    
    afterEach(() => {
        // Clean up environment
        delete process.env.AZURE_KEY_VAULT_URI;
        delete process.env.AZURE_KEY_VAULT_CERTIFICATE_NAME;
    });
    
    test('should initialize with default values', () => {
        expect(certificateManager.keyVaultUri).toBe('https://test-kv.vault.azure.net/');
        expect(certificateManager.certificateName).toBe('test-cert');
    });
    
    test('should use default certificate name when not provided', () => {
        delete process.env.AZURE_KEY_VAULT_CERTIFICATE_NAME;
        const manager = new CertificateManager();
        expect(manager.certificateName).toBe('teams-bot-auth-cert');
    });
    
    test('should validate environment correctly', () => {
        // Test with valid environment
        expect(certificateManager.validateEnvironment()).toBe(true);
        
        // Test with missing Key Vault URI
        delete process.env.AZURE_KEY_VAULT_URI;
        const managerWithoutKV = new CertificateManager();
        expect(managerWithoutKV.validateEnvironment()).toBe(false);
    });
    
    test('should create self-signed certificate options', async () => {
        const options = {
            commonName: 'test-bot',
            organization: 'Test Org',
            validityDays: 30
        };
        
        // Mock the crypto module for testing
        jest.spyOn(require('crypto'), 'generateKeyPairSync').mockReturnValue({
            publicKey: 'mock-public-key',
            privateKey: 'mock-private-key'
        });
        
        const certData = await certificateManager.createSelfSignedCertificate(options);
        
        expect(certData.subject).toContain('CN=test-bot');
        expect(certData.subject).toContain('O=Test Org');
        expect(certData.privateKey).toBe('mock-private-key');
        expect(certData.publicKey).toBe('mock-public-key');
    });
    
    test('should handle certificate creation errors gracefully', async () => {
        // Mock crypto to throw an error
        jest.spyOn(require('crypto'), 'generateKeyPairSync').mockImplementation(() => {
            throw new Error('Crypto operation failed');
        });
        
        await expect(certificateManager.createSelfSignedCertificate())
            .rejects.toThrow('Crypto operation failed');
    });
    
    test('should check certificate exists with mocked Key Vault client', async () => {
        // Mock the certificate client
        const mockGetCertificate = jest.fn();
        certificateManager.certificateClient = {
            getCertificate: mockGetCertificate
        };
        
        // Test certificate exists
        mockGetCertificate.mockResolvedValueOnce({ name: 'test-cert' });
        const exists = await certificateManager.checkCertificateExists('test-cert');
        expect(exists).toBe(true);
        
        // Test certificate not found
        const notFoundError = new Error('Not found');
        notFoundError.statusCode = 404;
        mockGetCertificate.mockRejectedValueOnce(notFoundError);
        const notExists = await certificateManager.checkCertificateExists('missing-cert');
        expect(notExists).toBe(false);
    });
});
