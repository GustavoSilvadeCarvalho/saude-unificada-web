import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import { Link, Redirect } from 'expo-router'
import { Alert, Button, Input, Logo, Screen } from '@/components/ui'
import { useAuth } from '@/auth/AuthContext'
import { colors } from '@/theme'
import { isValidCpf, maskCpf, onlyDigits } from '@/utils/cpf'

// Login do paciente pelo CPF, como no app do gov.br (docs/API_CONTRACT.md, seção 5.1).
// Profissionais de saúde e gestores continuam usando o site.

export default function Login() {
  const { user, loginWithCpf } = useAuth()
  const [cpf, setCpf] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Já autenticado vai direto para a carteira
  if (user) return <Redirect href="/(tabs)/carteira" />

  async function handleSubmit() {
    Keyboard.dismiss()
    setError('')
    if (onlyDigits(cpf).length !== 11) {
      setError('Informe os 11 dígitos do seu CPF.')
      return
    }
    if (!isValidCpf(cpf)) {
      setError('CPF inválido. Confira os dígitos.')
      return
    }
    if (!password) {
      setError('Informe sua senha.')
      return
    }
    setBusy(true)
    try {
      await loginWithCpf(cpf, password)
      // O redirecionamento acontece automaticamente pelo `if (user)` acima
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
      setBusy(false)
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Logo size={20} />
            <Text style={styles.title}>Entrar</Text>
            <Text style={styles.subtitle}>
              Acompanhe seu histórico de saúde com o seu CPF. Profissionais de saúde usam o site.
            </Text>
          </View>

          {error ? (
            <Alert tone="error">{error}</Alert>
          ) : (
            <Alert tone="info">Esqueceu a senha? Procure a unidade de saúde que atende você.</Alert>
          )}

          <View style={styles.form}>
            <Input
              label="CPF"
              value={cpf}
              onChangeText={(v) => setCpf(maskCpf(v))}
              keyboardType="number-pad"
              maxLength={14}
              placeholder="000.000.000-00"
              autoComplete="off"
              returnKeyType="next"
            />
            <Input
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="off"
              maxLength={64}
              placeholder="Sua senha"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
            <Button label={busy ? 'Entrando...' : 'Entrar'} full size="lg" busy={busy} onPress={handleSubmit} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ainda não tem conta? </Text>
            <Link href="/register" asChild>
              <Pressable hitSlop={8}>
                <Text style={styles.footerLink}>Criar conta</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  header: { alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: colors.slate[900], letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.slate[600], textAlign: 'center', lineHeight: 20 },
  form: { gap: 16, marginTop: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  footerText: { fontSize: 14, color: colors.slate[600] },
  footerLink: { fontSize: 14, fontWeight: '600', color: colors.brand[700] },
})
