import { useState } from 'react'
import QRCode from 'qrcode'
import fs from 'fs/promises'
import path from 'path'
import Head from 'next/head'

type Props = {
  defaultLogoDataUri: string
}

export async function getStaticProps() {
  const readBase64 = async (fn: string) => {
    const buf = await fs.readFile(path.join(process.cwd(), 'public', fn))
    return `data:image/png;base64,${buf.toString('base64')}`
  }
  const defaultLogoDataUri = await readBase64('docusign_logo.png')
  return { props: { defaultLogoDataUri } }
}

export default function Home({ defaultLogoDataUri }: Props) {
  const [url, setUrl] = useState('')
  const [template, setTemplate] = useState('Document')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [localLogoDataUri, setLocalLogoDataUri] = useState('')
  const [html, setHtml] = useState('')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')

  const templateConfig: Record<string, { header: string; cta: string }> = {
    Document: {
      header: 'Your document is ready to review and sign',
      cta: 'Scan the QR Code below to view or sign the shared document.'
    },
    Contract: {
      header: 'Your contract is ready to review and sign',
      cta: 'Scan the QR Code below to view or sign the contract.'
    },
    Invoice: {
      header: 'Your invoice is ready to view and pay',
      cta: 'Scan the QR Code below to view or pay the invoice.'
    },
    Statement: {
      header: 'Your statement is ready to view',
      cta: 'Scan the QR Code below to view your statement.'
    },
    Payment: {
      header: 'Payment Notification: Your payment details are ready',
      cta: 'Scan the QR Code below to review and confirm all invoices included in this payment.'
    }
  }

  const fetchLogoDataUri = async (url: string): Promise<string> => {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoUrl('')
    const reader = new FileReader()
    reader.onloadend = () => setLocalLogoDataUri(reader.result as string)
    reader.readAsDataURL(file)
  }

  const buildEmailHtml = (qrDataUri: string, logoToUse: string | null) => {
    const config = templateConfig[template] || templateConfig.Document
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${config.header}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;">
  <center style="width:100%;background-color:#f4f4f4;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:600px;background-color:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.1);overflow:hidden;margin:20px auto;">
      ${logoToUse ? `<tr><td align="center" style="padding:20px 0;"><img src="${logoToUse}" alt="Company Logo" width="120" style="display:block;margin-bottom:10px;"></td></tr>` : ''}
      <tr>
        <td align="center" style="padding:30px;background-color:#005eb8;color:#ffffff;font-family:Arial,sans-serif;">
          <h1 style="margin:0;font-size:24px;">${config.header}</h1>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:30px;">
          <img src="${qrDataUri}" alt="QR Code" width="200" style="display:block;border:1px solid #ddd;border-radius:4px;">
          <p style="font-family:Arial,sans-serif;font-size:20px;border-radius:4px;display:inline-block;margin:15px 0 0;">
            ${config.cta}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px;font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.5;">
          If you have any questions, reply to this email or contact our support team.
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:20px;font-family:Arial,sans-serif;font-size:12px;color:#777;">
          &copy; ${new Date().getFullYear()} Company. All rights reserved.
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`
  }

  const handleGenerate = async () => {
    if (!url) return alert('Please paste a URL first.')
    try {
      let customLogoDataUri: string | null = null
      if (localLogoDataUri) {
        customLogoDataUri = localLogoDataUri
      } else if (logoUrl) {
        try {
          customLogoDataUri = await fetchLogoDataUri(logoUrl)
        } catch {
          alert('Failed to fetch provided logo URL. Falling back to defaults.')
        }
      }
      const logoToUse = customLogoDataUri || (template === 'Document' ? defaultLogoDataUri : null)

      const qrDataUri = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: { dark: '#000', light: '#fff' }
      })
      setHtml(buildEmailHtml(qrDataUri, logoToUse))
      setCopyStatus('idle')
    } catch (e) {
      console.error(e)
      alert('Failed to generate QR code.')
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(html).then(() => {
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    })
  }

  return (
    <>
      <Head>
        <title>QR Code Email Template Generator</title>
      </Head>
      <main
        style={{
          fontFamily: 'Arial, sans-serif',
          display: 'flex',
          justifyContent: 'center',
          padding: '2rem'
        }}
      >
        <div
          style={{
            backgroundColor: '#000',
            color: '#005eb8',
            borderRadius: 8,
            padding: '2rem',
            maxWidth: 600,
            width: '100%'
          }}
        >
          <h1 style={{ marginBottom: '1rem' }}>QR Code Email Template Generator</h1>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Template:</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              style={{ width: '100%', padding: '.5rem', fontSize: '1rem' }}
            >
              <option>Document</option>
              <option>Contract</option>
              <option>Invoice</option>
              <option>Statement</option>
              <option>Payment</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Logo Upload (PNG/JPG):</label>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileChange}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Or Logo URL (optional):</label>
            <input
              type="text"
              placeholder="https://example.com/logo.png or .jpg"
              value={logoUrl}
              onChange={(e) => {
                setLogoUrl(e.target.value)
                setLogoFile(null)
                setLocalLogoDataUri('')
              }}
              style={{ width: '100%', padding: '.5rem', fontSize: '1rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>URL to Encode:</label>  
            <input
              type="text"
              placeholder="https://yourlink.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{ width: '100%', padding: '.5rem', fontSize: '1rem' }}
            />
          </div>

          <button
            onClick={handleGenerate}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              backgroundColor: '#005eb8',
              color: '#fff',
              border: 'none',
              borderRadius: 4
            }}
          >
            Generate Email HTML
          </button>

          {html && (
            <>
              <div style={{ marginTop: '1rem' }}>
                <button
                  onClick={handleCopy}
                  style={{
                    width: '100%',
                    padding: '.75rem',
                    fontSize: '.9rem',
                    backgroundColor: copyStatus === 'copied' ? '#28a745' : '#005eb8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4
                  }}
                >
                  {copyStatus === 'copied' ? 'Copied!' : 'Copy HTML'}
                </button>
              </div>
              <h2 style={{ margin: '1.5rem 0 0.5rem' }}>👀 Live Preview:</h2>
              <div
                style={{ border: '1px solid #ddd', borderRadius: 4 }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </>
          )}
        </div>
      </main>
    </>
  )
}
